const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(rootDir, 'assets/css/main.css'), 'utf8');
const mainJs = fs.readFileSync(path.join(rootDir, 'assets/js/main.js'), 'utf8');

function extractRuleBody(source, selectorPattern) {
  const match = source.match(selectorPattern);
  assert.ok(match, `Expected CSS block matching ${selectorPattern}`);
  return match[1];
}

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

function createMockElement(tagName, { classes = [], textContent = '', parent = null } = {}) {
  let _className = classes.join(' ');
  const attrs = {};
  const listeners = {};
  const children = [];
  const el = {
    tagName: tagName.toUpperCase(),
    textContent,
    children,
    parentNode: parent,
    get parentElement() { return this.parentNode; },
    classList: createClassList(classes),
    set className(val) {
      _className = String(val || '');
      _className.split(/\s+/).filter(Boolean).forEach(c => this.classList.add(c));
    },
    get className() {
      return this.classList.toArray().join(' ');
    },
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    dispatchEvent(type) {
      (listeners[type] || []).forEach(fn => fn({ target: el, preventDefault() {} }));
    },
    appendChild(child) {
      if (child.parentNode && child.parentNode.children) {
        const idx = child.parentNode.children.indexOf(child);
        if (idx !== -1) child.parentNode.children.splice(idx, 1);
      }
      child.parentNode = el;
      children.push(child);
      return child;
    },
    insertBefore(newNode, refNode) {
      newNode.parentNode = el;
      const idx = children.indexOf(refNode);
      if (idx === -1) children.push(newNode);
      else children.splice(idx, 0, newNode);
      return newNode;
    },
    querySelectorAll: () => [],
    querySelector: () => null
  };
  return el;
}

test('main.css applies mobile text-size-adjust, overflow-wrap, and flex shrinking guards', () => {
  const htmlRule = extractRuleBody(css, /html\s*\{([\s\S]*?)\}/);
  assert.match(htmlRule, /-webkit-text-size-adjust:\s*100%/);
  assert.match(htmlRule, /text-size-adjust:\s*100%/);

  const bodyRule = extractRuleBody(css, /body\s*\{([\s\S]*?)\}/);
  assert.match(bodyRule, /overflow-wrap:\s*break-word/);

  const postWrapRule = extractRuleBody(css, /\.post\.wrap\s*\{([\s\S]*?)\}/);
  assert.match(postWrapRule, /min-width:\s*0/);

  const siteMainRule = extractRuleBody(css, /\.site-main\s*\{([\s\S]*?)\}/);
  assert.match(siteMainRule, /width:\s*100%/);
  assert.match(siteMainRule, /min-width:\s*0/);

  const breadcrumbCurrRule = extractRuleBody(css, /\.post-breadcrumb-current\s*\{([\s\S]*?)\}/);
  assert.match(breadcrumbCurrRule, /min-width:\s*0/);
});

test('main.css scopes text-wrap: pretty to English posts/UI instead of Chinese article prose', () => {
  const selectorsWithoutPretty = [
    /\.post-title\s*\{([\s\S]*?)\}/,
    /\.post-subtitle,\s*\.page-subtitle\s*\{([\s\S]*?)\}/,
    /\.prose h2\s*\{([\s\S]*?)\}/,
    /\.prose h3\s*\{([\s\S]*?)\}/,
    /\.prose p\s*\{([\s\S]*?)\}/,
    /\.post-nav \.ttl\s*\{([\s\S]*?)\}/,
    /\.tool-callout-desc\s*\{([\s\S]*?)\}/,
    /\.post-author-bio\s*\{([\s\S]*?)\}/,
    /\.subscribe-desc\s*\{([\s\S]*?)\}/
  ];
  for (const pat of selectorsWithoutPretty) {
    const body = extractRuleBody(css, pat);
    assert.doesNotMatch(body, /text-wrap:\s*pretty/, `Expected no unconditional text-wrap: pretty in ${pat}`);
  }

  assert.match(
    css,
    /\.post:lang\(en\)\s*:is\(\.post-title,\s*\.post-subtitle,\s*\.prose h2,\s*\.prose h3,\s*\.prose p,\s*\.post-nav \.ttl\)\s*\{[\s\S]*?text-wrap:\s*pretty;/
  );
  assert.match(
    css,
    /html\[data-ui-lang="en"\]\s*:is\(\.tool-callout-desc,\s*\.post-author-bio,\s*\.subscribe-desc\)\s*\{[\s\S]*?text-wrap:\s*pretty;/
  );
});

test('main.css protects prose links, inline code pills, and pre blocks against mobile wrapping/clipping bugs', () => {
  const proseRule = extractRuleBody(css, /\.prose\s*\{([\s\S]*?)\}/);
  assert.match(proseRule, /min-width:\s*0/);
  assert.match(proseRule, /overflow-wrap:\s*break-word/);
  assert.match(proseRule, /word-break:\s*normal/);

  const proseLinkRule = extractRuleBody(css, /\.prose a\s*\{([\s\S]*?)\}/);
  assert.match(proseLinkRule, /overflow-wrap:\s*anywhere/);

  const proseCodeRule = extractRuleBody(css, /\.prose code\s*\{([\s\S]*?)\}/);
  assert.match(proseCodeRule, /overflow-wrap:\s*anywhere/);
  assert.match(proseCodeRule, /-webkit-box-decoration-break:\s*clone/);
  assert.match(proseCodeRule, /box-decoration-break:\s*clone/);

  const prosePreRule = extractRuleBody(css, /\.prose pre\s*\{([\s\S]*?)\}/);
  assert.match(prosePreRule, /max-width:\s*100%/);
  assert.match(prosePreRule, /-webkit-overflow-scrolling:\s*touch/);

  const prosePreCodeRule = extractRuleBody(css, /\.prose pre code\s*\{([\s\S]*?)\}/);
  assert.match(prosePreCodeRule, /overflow-wrap:\s*normal/);
  assert.match(prosePreCodeRule, /box-decoration-break:\s*slice/);
});

test('main.css includes scrollable table wrapper and mobile column width guards', () => {
  const wrapRule = extractRuleBody(css, /\.prose-table-wrap\s*\{([\s\S]*?)\}/);
  assert.match(wrapRule, /width:\s*100%/);
  assert.match(wrapRule, /overflow-x:\s*auto/);
  assert.match(wrapRule, /-webkit-overflow-scrolling:\s*touch/);

  assert.ok(
    css.indexOf('.prose-table-wrap > table') > css.indexOf('.prose table {'),
    '.prose-table-wrap > table must appear after .prose table to reset margin/border/radius'
  );
  const wrapTableRule = extractRuleBody(css, /\.prose-table-wrap\s*>\s*table\s*\{([\s\S]*?)\}/);
  assert.match(wrapTableRule, /margin:\s*0/);
  assert.match(wrapTableRule, /border:\s*0/);
  assert.match(wrapTableRule, /border-radius:\s*0/);

  const mobile640 = extractRuleBody(css, /@media\s*\(max-width:\s*640px\)\s*\{([\s\S]*?\n)\}/);
  assert.match(mobile640, /\.prose-table-wrap\s*>\s*table:has\(tr\s*>\s*:nth-child\(3\)\)\s*\{[^}]*min-width:\s*540px/);
  assert.match(mobile640, /\.prose-table-wrap\s*>\s*table:has\(tr\s*>\s*:nth-child\(4\)\)\s*\{[^}]*min-width:\s*640px/);
  assert.match(mobile640, /\.prose\s*>\s*table\s*\{[^}]*display:\s*block;[^}]*overflow-x:\s*auto;/);
  assert.match(mobile640, /\.prose th:first-child,\s*\.prose td:first-child\s*\{[^}]*min-width:\s*6\.5em/);
  assert.match(mobile640, /\.prose th:not\(:first-child\),\s*\.prose td:not\(:first-child\)\s*\{[^}]*min-width:\s*10\.5em/);

  const mobile600 = extractRuleBody(css, /@media\s*\(max-width:\s*600px\)\s*\{([\s\S]*)$/);
  assert.match(mobile600, /\.prose pre\.prose-pre-wrap\s*\{[^}]*white-space:\s*pre-wrap;[^}]*overflow-wrap:\s*break-word;/);
  assert.doesNotMatch(mobile600, /\.prose table\s*\{/);
});

test('main.js wraps prose tables accessibly without double-wrapping and selectively wraps plain-text pre blocks', () => {
  const proseContainer = createMockElement('div', { classes: ['prose'] });
  const rawTable = createMockElement('table', { parent: proseContainer });
  proseContainer.appendChild(rawTable);

  const existingWrap = createMockElement('div', { classes: ['prose-table-wrap'], parent: proseContainer });
  const alreadyWrappedTable = createMockElement('table', { parent: existingWrap });
  existingWrap.appendChild(alreadyWrappedTable);
  proseContainer.appendChild(existingWrap);

  const plainPre = createMockElement('pre', {
    textContent: '先想清目标和自己能承受什么\n  → 再给每个仓位找一个角色\n  → 分清什么只是噪音，什么真的改变了判断'
  });
  const asciiPre = createMockElement('pre', {
    textContent: 'MooMoo 保证金账户\n          │\n          ├─ 成长落袋后的资金 ──→ 嘉信'
  });

  const langToggleBtn = createMockElement('button');
  const htmlRoot = createMockElement('html');
  const storage = { site: {} };

  const mockDocument = {
    documentElement: htmlRoot,
    getElementById: id => (id === 'lang-toggle' ? langToggleBtn : null),
    querySelector: () => null,
    querySelectorAll: selector => {
      if (selector === '.prose table') return [rawTable, alreadyWrappedTable];
      if (selector === '.prose .language-text pre') return [plainPre, asciiPre];
      return [];
    },
    createElement: tag => createMockElement(tag),
    addEventListener: () => {}
  };

  vm.runInNewContext(mainJs, {
    window: { addEventListener: () => {}, location: { pathname: '/posts/test/', search: '' } },
    document: mockDocument,
    localStorage: {
      getItem: k => (Object.prototype.hasOwnProperty.call(storage.site, k) ? storage.site[k] : null),
      setItem: (k, v) => { storage.site[k] = String(v); },
      removeItem: k => { delete storage.site[k]; }
    },
    navigator: { platform: 'iPhone', userAgent: 'iPhone' }
  });

  // 1. rawTable should be wrapped in a single .prose-table-wrap with accessible attributes
  const wrapper = rawTable.parentElement;
  assert.ok(wrapper, 'rawTable should have a wrapper parent');
  assert.ok(wrapper.classList.contains('prose-table-wrap'));
  assert.equal(wrapper.getAttribute('role'), 'region');
  assert.equal(wrapper.getAttribute('tabindex'), '0');
  assert.equal(wrapper.getAttribute('aria-label'), '可横向滚动查看的表格');
  assert.equal(wrapper.parentElement, proseContainer);

  // 2. alreadyWrappedTable must not be double-wrapped
  assert.equal(alreadyWrappedTable.parentElement, existingWrap);
  assert.equal(existingWrap.children.length, 1);

  // 3. Language toggle updates aria-label dynamically
  langToggleBtn.dispatchEvent('click');
  assert.equal(wrapper.getAttribute('aria-label'), 'Scrollable data table');

  // 4. Plain-text <pre> gets prose-pre-wrap while ASCII box diagram preserves pre formatting
  assert.ok(plainPre.classList.contains('prose-pre-wrap'));
  assert.ok(!asciiPre.classList.contains('prose-pre-wrap'));
});
