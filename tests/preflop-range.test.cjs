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
    value: '',
    hidden: false,
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
    getAttribute: (k) => (k in attributes ? attributes[k] : null),
    removeAttribute: (k) => { delete attributes[k]; },
    hasAttribute: (k) => k in attributes,
    contains: () => false,
    addEventListener: (type, fn) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    trigger: (type, event = {}) => {
      (listeners[type] || []).forEach(fn => fn(event));
    },
    append: (...nodes) => {
      nodes.forEach(n => {
        const inner = n.textContent || n.innerHTML || '';
        el.innerHTML += `<${n.tag || 'span'}>${inner}</${n.tag || 'span'}>`;
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
    if (!elements[id]) elements[id] = createMockElement(id, id);
    return elements[id];
  };

  const requiredIds = [
    'position-tabs', 'matrix', 'range-panel', 'position-name', 'position-desc',
    'combo-count', 'range-percent', 'hand-result', 'range-text', 'copy-button',
    'range-mode', 'clear-range', 'restore-range', 'mode-view', 'mode-edit', 'tool-hint',
    'diff-prev', 'diff-baseline', 'diff-summary', 'toggle-import-btn', 'import-panel',
    'import-input', 'apply-import-btn', 'merge-import-btn', 'cancel-import-btn',
    'import-feedback', 'legend'
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
    createTextNode: (text) => ({ tag: '#text', textContent: String(text) }),
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

test('preflop-range masthead title matches unified 31px font size, integrates chips and removes divider', () => {
  assert.ok(html.includes('<h1 id="page-title">翻前开池范围</h1>'), 'Masthead must contain h1 page-title');
  assert.ok(html.includes('font-size: 31px'), 'h1 font size must be unified to 31px');
  assert.ok(!html.includes('clamp(32px, 4.5vw, 48px)'), 'Must not have obsolete 48px clamp title');
  assert.ok(!html.includes('class="hero"'), 'Must not have redundant hero section');
  assert.ok(!html.includes('选定位置查看或编辑起手牌范围'), 'Must not contain removed masthead note text');
  assert.ok(html.includes('<header class="masthead">') && html.includes('class="assumptions"'), 'Masthead must integrate assumptions chips');
  assert.ok(!html.includes('border-bottom: 1px solid var(--sand);\n    }\n\n    .back-link'), 'Masthead must not have border-bottom divider');
});

test('preflop-range tool-head repositions mode switch to left and removes duplicate RFI title', () => {
  assert.ok(!html.includes('无人入池时开池（RFI）'), 'Duplicate RFI title must be removed');
  assert.ok(!html.includes('id="tool-title"'), 'tool-title id must be removed');
  assert.ok(html.includes('<div class="tool-head">\n        <div class="mode-switch"'), 'mode-switch must be placed at the start of tool-head');
  assert.ok(html.includes('id="tool-hint"'), 'tool-hint must remain for screen reader feedback');
});

test('compressRange round-trips all default positions and gap ranges accurately', () => {
  const env = createEnv();
  const preflop = env.eval('window.__preflop');

  for (const [, posState] of preflop.parsedRanges.entries()) {
    const compressed = preflop.compressRange(posState.defaultHands);
    const reparsed = preflop.parseRange(compressed);
    assert.equal(reparsed.errors.length, 0, 'Compressed range must parse cleanly without errors');
    assert.deepEqual(
      Array.from(new Set(Array.from(reparsed.hands))).sort(),
      Array.from(posState.defaultHands).sort(),
      'Compressed range must round-trip losslessly'
    );
  }

  const gapSet = new Set(Array.from(preflop.parseRange('KK-JJ, AJs-A9s, KJo-K9o').hands));
  const compressedGap = preflop.compressRange(gapSet);
  assert.equal(compressedGap, 'KK-JJ, AJs-A9s, KJo-K9o', 'Gap ranges must compress using dash notation');
  assert.equal(preflop.compressRange(new Set()), '', 'Empty set must compress to empty string');
});

test('parseRange handles extended separators, dashes, 10->T, bare non-pairs and rejects invalid tokens', () => {
  const env = createEnv();
  const parse = (txt) => JSON.parse(JSON.stringify(env.eval(`window.__preflop.parseRange(${JSON.stringify(txt)})`)));

  const valid = parse('TT–JJ、A10s K9s~K7s AK AQ+');
  assert.equal(valid.errors.length, 0, 'Valid extended range tokens should produce zero errors');
  for (const expected of ['TT', 'JJ', 'ATs', 'K9s', 'K8s', 'K7s', 'AKs', 'AKo', 'AQs', 'AQo']) {
    assert.ok(valid.hands.includes(expected), `Parsed range must include ${expected}`);
  }

  const invalid = parse('AA, XYZ, 22s, AAo, KA, 9Ts');
  assert.deepEqual(invalid.hands, ['AA'], 'Valid token AA must still parse alongside invalid ones');
  assert.deepEqual(invalid.errors, ['XYZ', '22s', 'AAo', 'KA', '9Ts'], 'All malformed tokens must appear in errors');
});

test('applyImportedRange handles replace, merge, and preserves existing range with accessible errors on failure', () => {
  const env = createEnv();
  const preflop = env.eval('window.__preflop');
  const originalHands = Array.from(preflop.currentRangeState().hands).sort();

  const badRes = env.eval('window.__preflop.applyImportedRange("55+, XYZ, 22s")');
  assert.equal(badRes.ok, false, 'Invalid import must fail');
  assert.deepEqual(
    Array.from(preflop.currentRangeState().hands).sort(),
    originalHands,
    'Invalid import must not overwrite existing hands'
  );
  assert.equal(env.elements['import-input'].getAttribute('aria-invalid'), 'true', 'import-input must set aria-invalid="true"');
  assert.equal(env.elements['import-input'].getAttribute('aria-describedby'), 'import-feedback', 'import-input must link import-feedback');

  const okReplace = env.eval('window.__preflop.applyImportedRange("55+, AQo+")');
  assert.equal(okReplace.ok, true, 'Valid import must succeed');
  assert.equal(env.elements['import-input'].getAttribute('aria-invalid'), 'false', 'Valid import must clear aria-invalid');
  assert.equal(env.elements['import-input'].getAttribute('aria-describedby'), null, 'Valid import must unlink aria-describedby');
  assert.equal(env.elements['range-text'].textContent, '55+, AQo+', 'range-text must show compressed imported notation');

  const okMerge = env.eval('window.__preflop.applyImportedRange("44, KQs", { mode: "merge" })');
  assert.equal(okMerge.ok, true, 'Merge import must succeed');
  assert.ok(preflop.currentRangeState().hands.has('44') && preflop.currentRangeState().hands.has('KQs'), 'Merged hands must be present');
  assert.ok(preflop.currentRangeState().hands.has('AA'), 'Previously imported hands must remain after merge');
});

test('setDiffMode computes position incremental diffs and baseline offset diffs accurately', () => {
  const env = createEnv();

  // UTG edge case in prev mode
  env.eval('window.__preflop.setDiffMode("prev")');
  const utgDiff = env.eval('window.__preflop.computeDiff("UTG", "prev")');
  assert.equal(utgDiff.available, false, 'UTG must report prev diff unavailable');
  assert.ok(env.elements['diff-summary'].textContent.includes('UTG'), 'UTG diff summary must explain earliest position');

  // Switch to CO -> compare vs HJ
  env.eval('window.__preflop.state.positionId = "CO"; window.__preflop.render ? null : null;');
  env.eval('window.__preflop.setDiffMode("prev")');
  const coPrevDiff = env.eval('window.__preflop.computeDiff("CO", "prev")');
  assert.equal(coPrevDiff.available, true);
  assert.equal(coPrevDiff.prevShort, 'HJ');
  assert.ok(coPrevDiff.added.has('K5s') && coPrevDiff.added.has('JTo'), 'CO prev diff must include newly widened hands');
  assert.ok(env.elements['diff-summary'].textContent.includes('较 HJ 新增'), 'Summary must reflect HJ -> CO delta');

  // Switch to baseline diff after modifying CO
  env.eval('window.__preflop.toggleHand("72o"); window.__preflop.toggleHand("AA"); window.__preflop.setDiffMode("baseline");');
  const baseDiff = env.eval('window.__preflop.computeDiff("CO", "baseline")');
  assert.equal(baseDiff.available, true);
  assert.ok(baseDiff.added.has('72o'), 'Added off-baseline hand 72o must appear in diff.added');
  assert.equal(baseDiff.addedCombos, 12);
  assert.ok(baseDiff.removed.has('AA'), 'Removed baseline hand AA must appear in diff.removed');
  assert.equal(baseDiff.removedCombos, 6);
  assert.ok(env.elements['diff-summary'].textContent.includes('多松 +1 格（+12）'), 'Summary must display added combos');
  assert.ok(env.elements['diff-summary'].textContent.includes('收紧 -1 格（-6）'), 'Summary must display removed combos');
});

test('getHandPositions and renderHandResult show 7-position boundary strip and earliest opening position', () => {
  const env = createEnv();
  const positionsKJo = JSON.parse(JSON.stringify(env.eval('window.__preflop.getHandPositions("KJo")')));
  assert.equal(positionsKJo.length, 7, 'Must return all 7 positions');
  assert.deepEqual(
    positionsKJo.map(p => [p.short, p.isOpen]),
    [['UTG', false], ['UTG+1', false], ['MP', false], ['HJ', true], ['CO', true], ['BTN', true], ['SB', true]],
    'KJo must open starting at HJ'
  );

  env.eval('window.__preflop.state.activeHand = "KJo"; window.__preflop.renderHandResult(window.__preflop.currentRangeState().hands);');
  const rendered = env.elements['hand-result'].innerHTML;
  assert.ok(rendered.includes('杂色 · 12 组合'), 'Must render hand type and combo pill');
  assert.ok(rendered.includes('最早开池位：HJ'), 'Must compute earliest opening position HJ');
});

test('toggling a hand back to match default range resets isEdited and clears localStorage', () => {
  const env = createEnv();
  env.eval('window.__preflop.toggleHand("72o")');
  assert.equal(env.eval('window.__preflop.currentRangeState().isEdited'), true);
  assert.ok(env.store['positive-ev-preflop-ranges-v1'], 'Storage should exist after edit');

  env.eval('window.__preflop.toggleHand("72o")');
  assert.equal(env.eval('window.__preflop.currentRangeState().isEdited'), false, 'Reverting single edit must clear isEdited');
  assert.equal(env.store['positive-ev-preflop-ranges-v1'], undefined, 'Storage must clean up automatically when default restored');
});

