const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/preflop-range/index.html'), 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'preflop-range must contain a <script> block');
const scriptCode = scriptMatch[1];

function createMockElement(tag, id = '') {
  const listeners = {};
  const classes = new Set();
  const attributes = {};
  const el = {
    tag,
    id,
    dataset: {},
    textContent: '',
    innerHTML: '',
    disabled: false,
    tabIndex: -1,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classes.has(c)) { classes.delete(c); return false; }
          classes.add(c); return true;
        }
        if (force) { classes.add(c); return true; }
        classes.delete(c); return false;
      },
      contains: (c) => classes.has(c)
    },
    setAttribute: (k, v) => { attributes[k] = String(v); },
    getAttribute: (k) => attributes[k] || null,
    addEventListener: (type, fn) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    trigger: (type, event = {}) => {
      (listeners[type] || []).forEach(fn => fn(event));
    },
    append: (...nodes) => {
      nodes.forEach(n => {
        el.innerHTML += `<${n.tag || 'span'}>${n.textContent || ''}</${n.tag || 'span'}>`;
      });
    },
    appendChild: (child) => {
      el.append(child);
      return child;
    },
    querySelectorAll: () => [],
    querySelector: () => null,
    focus: () => {}
  };
  return el;
}

function createEnv(initialStorage = {}) {
  const store = { ...initialStorage };
  const elements = {};
  const getEl = (id) => {
    if (!elements[id]) elements[id] = createMockElement(id);
    return elements[id];
  };

  const requiredIds = [
    'position-tabs', 'matrix', 'range-panel', 'position-name', 'position-desc',
    'combo-count', 'range-percent', 'hand-result', 'range-text', 'copy-button',
    'range-mode', 'clear-range', 'restore-range', 'mode-view', 'mode-edit', 'tool-hint'
  ];
  requiredIds.forEach(id => getEl(id));

  const window = {
    toolAnalytics: { action: () => {}, complete: () => {} },
    setTimeout: () => {},
    isSecureContext: true,
    confirm: () => true
  };

  const document = {
    getElementById: (id) => getEl(id),
    querySelector: (selector) => {
      const id = selector.replace(/^[#.]/, '');
      return getEl(id);
    },
    querySelectorAll: () => [],
    createDocumentFragment: () => ({
      appendChild: () => {}
    }),
    createElement: (tag) => createMockElement(tag),
    body: createMockElement('body')
  };

  const localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };

  const context = { window, document, localStorage, console, confirm: () => true };
  vm.createContext(context);
  vm.runInContext(scriptCode, context);
  return {
    context,
    store,
    elements,
    eval: (expr) => vm.runInContext(expr, context)
  };
}

test('preflop-range HTML markup contains mode switch, updated labels, and custom dot style', () => {
  assert.ok(html.includes('id="mode-view"'), 'Must have mode-view button');
  assert.ok(html.includes('id="mode-edit"'), 'Must have mode-edit button');
  assert.ok(html.includes('role="radiogroup"'), 'Mode switch must be a radiogroup');
  assert.ok(html.includes('id="tool-hint"'), 'Must have tool-hint element');
  assert.ok(html.includes('占全部组合'), 'Label must say 占全部组合 instead of 全部起手牌');
  assert.ok(html.includes('.position-tab.is-customized::after'), 'CSS must define dot indicator for customized tabs');
});

test('preflop-range initializes in view mode and toggles mode properly', () => {
  const env = createEnv();
  const preflop = env.eval('window.__preflop');
  assert.equal(preflop.state.interactionMode, 'view', 'Default interaction mode must be view');

  env.eval('window.__preflop.setInteractionMode("edit")');
  assert.equal(preflop.state.interactionMode, 'edit', 'Mode must switch to edit');
  assert.ok(env.elements['mode-edit'].classList.contains('active'), 'mode-edit must have active class');

  env.eval('window.__preflop.setInteractionMode("view")');
  assert.equal(preflop.state.interactionMode, 'view', 'Mode must switch back to view');
  assert.ok(env.elements['mode-view'].classList.contains('active'), 'mode-view must have active class');
});

test('preflop-range persists custom edits to localStorage and reloads on startup', () => {
  const env = createEnv();
  const preflop = env.eval('window.__preflop');
  const utgState = preflop.parsedRanges.get("UTG");
  assert.ok(utgState, 'UTG range must be present');

  // 1. 切换一手牌
  env.eval('window.__preflop.toggleHand("72o")');
  const storedJson = env.store['positive-ev-preflop-ranges-v1'];
  assert.ok(storedJson, 'localStorage must contain saved custom ranges');
  const parsed = JSON.parse(storedJson);
  assert.equal(parsed.version, 1, 'Stored data version must be 1');
  assert.ok(Array.isArray(parsed.positions.UTG), 'UTG must have stored hands array');
  assert.ok(parsed.positions.UTG.includes('72o'), 'Stored hands must include 72o');

  // 2. 模拟新会话加载该存储
  const env2 = createEnv(env.store);
  const preflop2 = env2.eval('window.__preflop');
  const utgState2 = preflop2.parsedRanges.get("UTG");
  assert.equal(utgState2.isEdited, true, 'Reloaded UTG range must be marked isEdited');
  assert.ok(utgState2.hands.has('72o'), 'Reloaded UTG hands must retain 72o');

  // 3. 恢复默认后应清空存储
  env2.eval('const s = window.__preflop.currentRangeState(); s.hands = new Set(s.defaultHands); s.isEdited = false; window.__preflop.saveStoredRanges();');
  assert.equal(env2.store['positive-ev-preflop-ranges-v1'], undefined, 'Storage must be cleaned up when no custom ranges remain');
});

test('hand result copy reflects custom vs author scope correctly', () => {
  const env = createEnv();
  const preflop = env.eval('window.__preflop');
  preflop.state.activeHand = "AA";
  env.eval('window.__preflop.renderHandResult(window.__preflop.currentRangeState().hands)');
  const defaultText = env.elements['hand-result'].innerHTML;
  assert.ok(defaultText.includes('当前作者开池范围') || defaultText.includes('未写入当前作者开池范围'), 'Default range must mention 当前作者');

  // 编辑后应为你的自定义
  preflop.currentRangeState().isEdited = true;
  env.eval('window.__preflop.renderHandResult(window.__preflop.currentRangeState().hands)');
  const customText = env.elements['hand-result'].innerHTML;
  assert.ok(customText.includes('你的自定义开池范围'), 'Customized range must mention 你的自定义');
});

test('preflop-range contains comprehensive focus-visible and reduced motion query', () => {
  assert.ok(html.includes('button:focus-visible'), 'CSS must define button:focus-visible');
  assert.ok(html.includes('a:focus-visible'), 'CSS must define a:focus-visible');
  assert.ok(html.includes('input:focus-visible'), 'CSS must define input:focus-visible');
  assert.ok(html.includes('prefers-reduced-motion'), 'CSS must define prefers-reduced-motion');
});

test('preflop-range masthead title matches unified 31px font size and brand structure', () => {
  assert.ok(html.includes('<h1 id="page-title">翻前开池范围</h1>'), 'Masthead must contain h1 page-title');
  assert.ok(html.includes('font-size: 31px'), 'h1 font size must be unified to 31px');
  assert.ok(!html.includes('clamp(32px, 4.5vw, 48px)'), 'Must not have obsolete 48px clamp title');
  assert.ok(!html.includes('class="hero"'), 'Must not have redundant hero section');
});

