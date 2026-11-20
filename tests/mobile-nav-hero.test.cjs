const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const headerHtml = fs.readFileSync(path.join(rootDir, '_includes/header.html'), 'utf8');
const headHtml = fs.readFileSync(path.join(rootDir, '_includes/head.html'), 'utf8');
const css = fs.readFileSync(path.join(rootDir, 'assets/css/main.css'), 'utf8');
const mainJs = fs.readFileSync(path.join(rootDir, 'assets/js/main.js'), 'utf8');

function createClassList(initial = []) {
  const set = new Set(initial.filter(Boolean));
  return {
    add: (...names) => names.forEach(n => set.add(n)),
    remove: (...names) => names.forEach(n => set.delete(n)),
    toggle: (name, force) => {
      if (force === undefined) {
        if (set.has(name)) { set.delete(name); return false; }
        set.add(name); return true;
      }
      if (force) set.add(name); else set.delete(name);
      return !!force;
    },
    contains: name => set.has(name),
    toArray: () => Array.from(set)
  };
}

function createMockElement(tagName, { id = '', classes = [], attrs = {}, scrollWidth = 0, clientWidth = 0 } = {}) {
  const listeners = {};
  const attrMap = { ...attrs };
  const children = [];
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    textContent: '',
    value: '',
    hidden: false,
    open: false,
    scrollWidth,
    clientWidth,
    scrollTop: 0,
    children,
    style: {},
    classList: createClassList(classes),
    setAttribute(k, v) { attrMap[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrMap, k) ? attrMap[k] : null; },
    removeAttribute(k) { delete attrMap[k]; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(attrMap, k); },
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    dispatchEvent(type, payload = {}) {
      const evt = { target: el, preventDefault() {}, stopPropagation() {}, ...payload };
      (listeners[type] || []).forEach(fn => fn(evt));
    },
    querySelectorAll: () => [],
    querySelector: () => null,
    appendChild(child) { children.push(child); return child; },
    getBoundingClientRect: () => ({ left: 0, right: 375, top: 0, bottom: 54, width: clientWidth || 375, height: 54 }),
    focus() {},
    closest: () => null,
    contains: target => target === el || children.includes(target),
    matches: () => false
  };
  return el;
}

function bootMain({ supportsNativePopover = true, desktopMatches = true, scrollWidth = 520, clientWidth = 960 } = {}) {
  const siteHeader = createMockElement('header', { id: 'site-header', classes: ['site-header'] });
  const headerInner = createMockElement('div', { classes: ['wrap', 'header-inner'], scrollWidth, clientWidth });
  const siteMenu = createMockElement('div', { id: 'site-menu', classes: ['site-menu'], attrs: { popover: 'auto' } });
  const menuToggle = createMockElement('button', { id: 'menu-toggle', classes: ['menu-toggle'], attrs: { 'aria-expanded': 'false' } });
  const searchBtn = createMockElement('button', { classes: ['mobile-search-btn'], attrs: { 'data-cmd-open': '' } });
  const navLinks = [createMockElement('a'), createMockElement('a')];

  let popoverOpenState = false;
  let showModalCalls = 0;
  let hidePopoverCalls = 0;

  siteMenu.matches = sel => sel === ':popover-open' && popoverOpenState;
  siteMenu.showPopover = () => { popoverOpenState = true; };
  siteMenu.hidePopover = () => { popoverOpenState = false; hidePopoverCalls++; };

  const cmdPalette = createMockElement('dialog', { id: 'cmd-palette' });
  cmdPalette.showModal = () => {
    cmdPalette.open = true;
    showModalCalls++;
  };
  cmdPalette.close = () => { cmdPalette.open = false; };
  const cmdInput = createMockElement('input', { id: 'cmd-input' });
  const cmdResults = createMockElement('div', { id: 'cmd-results' });
  const cmdClose = createMockElement('button', { id: 'cmd-close' });

  siteHeader.querySelector = sel => (sel === '.header-inner' ? headerInner : null);
  siteMenu.querySelectorAll = sel => (sel === 'a' ? navLinks : []);

  const byId = {
    'site-header': siteHeader,
    'site-menu': siteMenu,
    'menu-toggle': menuToggle,
    'cmd-palette': cmdPalette,
    'cmd-input': cmdInput,
    'cmd-results': cmdResults,
    'cmd-close': cmdClose
  };

  const docListeners = {};
  const htmlRoot = createMockElement('html');
  const storage = {};

  function MockHTMLElement() {}
  if (supportsNativePopover) {
    MockHTMLElement.prototype.popover = null;
  }

  const mockDocument = {
    documentElement: htmlRoot,
    getElementById: id => byId[id] || null,
    querySelector: () => null,
    querySelectorAll: sel => {
      if (sel === '[data-cmd-open]') return [searchBtn];
      return [];
    },
    createElement: tag => createMockElement(tag),
    addEventListener(type, fn) {
      docListeners[type] = docListeners[type] || [];
      docListeners[type].push(fn);
    }
  };

  const mockWindow = {
    location: { pathname: '/', search: '' },
    matchMedia: query => ({
      matches: query.includes('min-width: 681px') ? desktopMatches : false,
      addEventListener() {}
    }),
    addEventListener() {},
    requestAnimationFrame: fn => fn(),
    setTimeout: fn => fn(),
    clearTimeout() {}
  };

  vm.runInNewContext(mainJs, {
    window: mockWindow,
    document: mockDocument,
    HTMLElement: MockHTMLElement,
    HTMLDialogElement: { prototype: { closedBy: '' } },
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: k => { delete storage[k]; }
    },
    navigator: { platform: 'iPhone', userAgent: 'iPhone' }
  });

  return {
    siteHeader,
    siteMenu,
    menuToggle,
    searchBtn,
    cmdPalette,
    docListeners,
    setPopoverOpenState: v => { popoverOpenState = v; },
    getShowModalCalls: () => showModalCalls,
    getHidePopoverCalls: () => hidePopoverCalls
  };
}

test('_includes/header.html and _includes/head.html use single nav landmark, native popover, and viewport-fit=cover', () => {
  const navMatches = headerHtml.match(/<nav\b/g) || [];
  assert.equal(navMatches.length, 1, 'Expected exactly one <nav> landmark in header.html');
  assert.match(headerHtml, /id="menu-toggle"[^>]*popovertarget="site-menu"/);
  assert.match(headerHtml, /popovertargetaction="toggle"/);
  assert.match(headerHtml, /aria-controls="site-menu"/);
  assert.match(headerHtml, /aria-expanded="false"/);
  assert.match(headerHtml, /id="site-menu"[^>]*popover="auto"/);
  assert.match(headerHtml, /aria-current="page"/);
  assert.match(headerHtml, /class="mobile-search-btn"[^>]*data-cmd-open/);
  assert.match(headerHtml, /id="theme-toggle"/);
  assert.match(headerHtml, /id="lang-toggle"/);

  assert.match(headHtml, /name="viewport"[^>]*viewport-fit=cover/);
});

test('main.css styles 54px single-row mobile header, accessible popover transitions, desktop no-FOUC, and compact mobile hero', () => {
  assert.match(css, /\.header-inner\s*\{[^}]*height:\s*54px;/);
  assert.match(css, /\.mobile-search-btn::after,\s*\.menu-toggle::after\s*\{[^}]*inset:\s*-4px;/);
  assert.match(css, /\.site-menu-list a\s*\{[^}]*min-block-size:\s*44px;/);

  const siteMenuRule = css.match(/\.site-menu\s*\{([\s\S]*?)\}/);
  assert.ok(siteMenuRule, 'Expected .site-menu rule');
  const menuBody = siteMenuRule[1];
  const fallbackIdx = menuBody.indexOf('inset-block-start: 62px');
  const anchorIdx = menuBody.indexOf('inset-block-start: anchor(--menu-toggle bottom)');
  assert.ok(fallbackIdx !== -1 && anchorIdx !== -1 && fallbackIdx < anchorIdx, 'Expected absolute fallback before anchor()');
  assert.match(menuBody, /transition-behavior:\s*allow-discrete;/);
  assert.match(css, /@starting-style\s*\{[\s\S]*?\.site-menu:is\(:popover-open,\s*\.is-popover-fallback-open\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.site-menu\s*\{[\s\S]*?translate:\s*none;/);
  assert.match(css, /\.site-menu-list a:is\(\.active,\s*\[aria-current="page"\]\)::after\s*\{[\s\S]*?width:\s*6px;[\s\S]*?height:\s*6px;/);

  assert.match(css, /@media\s*\(min-width:\s*681px\)\s*\{[\s\S]*?\.site-header:not\(\.is-collapsed\)\s+\.site-menu\s*\{/);

  const mobile600 = css.match(/@media\s*\(max-width:\s*600px\)\s*\{([\s\S]*)$/);
  assert.ok(mobile600, 'Expected @media (max-width: 600px)');
  assert.match(mobile600[1], /\.hero-fullscreen\s*\{[^}]*min-height:\s*clamp\(340px,\s*56dvh,\s*460px\);/);
  assert.match(mobile600[1], /\.hero-fullscreen\s+\.hero-title\s*\{[^}]*font-size:\s*clamp\(1\.875rem,\s*1\.15rem \+ 3\.2vw,\s*2\.375rem\);/);
  assert.match(mobile600[1], /\.hero-scroll-cue\s*\{\s*display:\s*none;\s*\}/);
  assert.match(mobile600[1], /\.hero-fullscreen\s*\+\s*\.posts\s*\{\s*padding-top:\s*28px;/);
});

test('main.js collapses mobile nav with popover="auto", syncs aria-expanded, and opens command palette from mobile search button', () => {
  const ctx = bootMain({ supportsNativePopover: true, desktopMatches: false, scrollWidth: 375, clientWidth: 375 });
  assert.ok(ctx.siteHeader.classList.contains('is-collapsed'));
  assert.ok(!ctx.siteHeader.classList.contains('is-wide'));
  assert.equal(ctx.siteMenu.getAttribute('popover'), 'auto');

  ctx.setPopoverOpenState(true);
  ctx.siteMenu.dispatchEvent('toggle', { newState: 'open' });
  assert.equal(ctx.menuToggle.getAttribute('aria-expanded'), 'true');

  ctx.searchBtn.dispatchEvent('click');
  assert.equal(ctx.getShowModalCalls(), 1);
  assert.equal(ctx.getHidePopoverCalls(), 1);
  assert.equal(ctx.menuToggle.getAttribute('aria-expanded'), 'false');
});

test('main.js expands wide desktop header inline and removes popover attribute', () => {
  const ctx = bootMain({ supportsNativePopover: true, desktopMatches: true, scrollWidth: 520, clientWidth: 960 });
  assert.ok(ctx.siteHeader.classList.contains('is-wide'));
  assert.ok(!ctx.siteHeader.classList.contains('is-collapsed'));
  assert.equal(ctx.siteMenu.getAttribute('popover'), null);
});

test('main.js handles non-popover fallback and overflowing inline header via toggle and Escape', () => {
  const ctx = bootMain({ supportsNativePopover: false, desktopMatches: true, scrollWidth: 740, clientWidth: 700 });
  assert.ok(ctx.siteHeader.classList.contains('is-collapsed'));
  assert.equal(ctx.siteMenu.getAttribute('popover'), null);

  ctx.menuToggle.dispatchEvent('click');
  assert.ok(ctx.siteMenu.classList.contains('is-popover-fallback-open'));
  assert.equal(ctx.menuToggle.getAttribute('aria-expanded'), 'true');

  ctx.menuToggle.dispatchEvent('click');
  assert.ok(!ctx.siteMenu.classList.contains('is-popover-fallback-open'));
  assert.equal(ctx.menuToggle.getAttribute('aria-expanded'), 'false');

  ctx.menuToggle.dispatchEvent('click');
  (ctx.docListeners.keydown || []).forEach(fn => fn({ key: 'Escape', preventDefault() {} }));
  assert.ok(!ctx.siteMenu.classList.contains('is-popover-fallback-open'));
  assert.equal(ctx.menuToggle.getAttribute('aria-expanded'), 'false');
});
