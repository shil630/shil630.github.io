const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/wechat-formatter/index.html'), 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'wechat-formatter must contain a <script> block');
const scriptCode = scriptMatch[1];

function createEnv() {
  const store = {};
  const mockElements = {
    source: { value: '', addEventListener: () => {}, focus: () => {} },
    preview: { innerHTML: '', innerText: '' },
    toast: { textContent: '', classList: { add: () => {}, remove: () => {} } },
    wordCount: { textContent: '' },
    mobileWordCount: { textContent: '' },
    themeRow: { appendChild: () => {}, querySelectorAll: () => [] },
    tuneToggleBtn: { addEventListener: () => {}, classList: { toggle: () => {} }, setAttribute: () => {} },
    tunePanel: { hidden: true },
    tuneColorPicker: { value: '', addEventListener: () => {} },
    tuneColorVal: { textContent: '' },
    tuneResetColor: { addEventListener: () => {} },
    tuneH2Select: { value: '', addEventListener: () => {} },
    tuneQuoteSelect: { value: '', addEventListener: () => {} },
    tuneResetAll: { addEventListener: () => {} },
    tabEdit: { addEventListener: () => {}, classList: { toggle: () => {} }, setAttribute: () => {} },
    tabPreview: { addEventListener: () => {}, classList: { toggle: () => {} }, setAttribute: () => {} },
    mobilePreviewCta: { addEventListener: () => {} },
    mobileDrawerToggle: { addEventListener: () => {}, setAttribute: () => {} },
    mobileDrawerBody: { hidden: true },
    mobileDrawerArrow: { textContent: '' },
    sampleBtn: { addEventListener: () => {} },
    clearBtn: { addEventListener: () => {} },
    copyBtn: { addEventListener: () => {} },
    mobileCopyBtn: { addEventListener: () => {} },
    downloadBtn: { addEventListener: () => {} },
    mobileDownloadBtn: { addEventListener: () => {} }
  };

  const window = {
    toolAnalytics: { action: () => {}, complete: () => {} },
    scrollTo: () => {}
  };
  const document = {
    querySelector: (selector) => {
      const id = selector.replace(/^[#.]/, '');
      return mockElements[id] || { addEventListener: () => {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, setAttribute: () => {} };
    },
    querySelectorAll: () => [],
    createElement: () => ({ addEventListener: () => {}, classList: { toggle: () => {} }, dataset: {}, innerHTML: '' }),
    body: { classList: { remove: () => {}, add: () => {} } }
  };
  const localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };

  const context = { window, document, localStorage, setTimeout: () => {}, console };
  vm.createContext(context);
  vm.runInContext(scriptCode, context);
  return {
    context,
    eval: (expr) => vm.runInContext(expr, context)
  };
}

test('THEMES has 8 distinct themes with proper color and variant definitions', () => {
  const env = createEnv();
  const themes = env.eval('THEMES');
  assert.equal(themes.length, 8, 'Must have 8 themes');
  const ids = themes.map(t => t.id);
  assert.equal(ids.join(','), 'zheng-ev,mo-xian,qing-ye,liu-bai,zi-qiong,shan-hu,hu-po,song-shi');
  for (const t of themes) {
    assert.ok(t.name, `Theme ${t.id} must have a name`);
    assert.ok(t.c.accent, `Theme ${t.id} must have accent color`);
    assert.ok(t.v.h2, `Theme ${t.id} must have h2 variant`);
    assert.ok(t.v.quote, `Theme ${t.id} must have quote variant`);
  }
});

test('first quote block does NOT contain "引言" tag', () => {
  const env = createEnv();
  const md = '> 好的决策不是预测对了什么，而是在不确定里守住了什么。';
  const htmlResult = env.eval(`render(${JSON.stringify(md)})`);
  assert.ok(!htmlResult.includes('引言'), 'Rendered quote block must NOT contain the word 引言');
  assert.ok(htmlResult.includes('好的决策不是预测对了什么'), 'Quote content must be present');
});

test('computePalette generates valid derived colors', () => {
  const env = createEnv();
  const palette = env.eval("computePalette('#B64B3B')");
  assert.equal(palette.accent, '#B64B3B');
  assert.match(palette.deep, /^#[0-9a-fA-F]{6}$/);
  assert.match(palette.tint, /^#[0-9a-fA-F]{6}$/);
  assert.match(palette.blockBg, /^#[0-9a-fA-F]{6}$/);
  assert.match(palette.codeBg, /^#[0-9a-fA-F]{6}$/);
  assert.match(palette.dark, /^#[0-9a-fA-F]{6}$/);
});

test('wechat-formatter HTML contains mobile header, segmented tabs, and brand title', () => {
  assert.ok(html.includes('class="mobile-header"'), 'Must have mobile-header');
  assert.ok(html.includes('id="tabEdit"'), 'Must have tabEdit');
  assert.ok(html.includes('id="tabPreview"'), 'Must have tabPreview');
  assert.ok(html.includes('id="mobileActions"'), 'Must have mobileActions');
  assert.ok(html.includes('id="tunePanel"'), 'Must have tunePanel');
  assert.ok(html.includes('公众号排版器'), 'Sidebar must show 公众号排版器 title');
  assert.ok(html.includes('Markdown 实时预览、主题切换，一键复制适配公众号的富文本。'), 'Sidebar must show tagline description');
});
