const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/wechat-formatter/index.html'), 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'wechat-formatter must contain a <script> block');
const scriptCode = scriptMatch[1];

function createEnv(initialStorage = {}) {
  const store = { ...initialStorage };
  const makeMock = () => ({
    addEventListener: () => {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    setAttribute: () => {},
    removeAttribute: () => {},
    dataset: {},
    style: {}
  });
  const mockElements = {
    source: { value: '', scrollTop: 0, scrollHeight: 0, clientHeight: 0, selectionStart: 0, selectionEnd: 0, addEventListener: () => {}, setRangeText: () => {}, focus: () => {} },
    preview: { innerHTML: '', innerText: '', style: {}, classList: { toggle: () => {} } },
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
    importFileBtn: makeMock(),
    mdFileInput: { ...makeMock(), files: [], value: '', click: () => {} },
    editorWrap: makeMock(),
    panguBtn: makeMock(),
    syncScrollToggle: { ...makeMock(), checked: true },
    previewWidthGroup: makeMock(),
    tuneLinkFootnoteGroup: makeMock(),
    copyBtn: { ...makeMock(), textContent: '复制到公众号' },
    mobileCopyBtn: { ...makeMock(), textContent: '复制到公众号' },
    downloadBtn: { addEventListener: () => {} },
    mobileDownloadBtn: { addEventListener: () => {} }
  };

  const window = {
    toolAnalytics: { action: () => {}, complete: () => {} },
    scrollTo: () => {},
    innerWidth: 1280
  };
  const document = {
    querySelector: (selector) => {
      const id = selector.replace(/^[#.]/, '');
      return mockElements[id] || makeMock();
    },
    querySelectorAll: () => [],
    createElement: () => ({ addEventListener: () => {}, classList: { toggle: () => {} }, dataset: {}, innerHTML: '', textContent: '' }),
    body: { classList: { remove: () => {}, add: () => {} } }
  };
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };

  const context = { window, document, localStorage, setTimeout: () => 1, clearTimeout: () => {}, console, confirm: () => true };
  vm.createContext(context);
  vm.runInContext(scriptCode, context);
  return {
    context,
    mockElements,
    store,
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

test('wechat-formatter HTML contains mobile header, segmented tabs, brand title and no dots', () => {
  assert.ok(html.includes('class="mobile-header"'), 'Must have mobile-header');
  assert.ok(html.includes('id="tabEdit"'), 'Must have tabEdit');
  assert.ok(html.includes('id="tabPreview"'), 'Must have tabPreview');
  assert.ok(html.includes('id="mobileActions"'), 'Must have mobileActions');
  assert.ok(html.includes('id="tunePanel"'), 'Must have tunePanel');
  assert.ok(html.includes('class="brand-header"'), 'Sidebar must have brand-header class');
  assert.ok(!html.includes('class="dots"'), 'Sidebar must NOT contain three dots');
  assert.ok(html.includes('公众号排版器'), 'Sidebar must show 公众号排版器 title');
  assert.ok(html.includes('Markdown 实时预览、主题切换，一键复制适配公众号的富文本。'), 'Sidebar must show tagline description');
});

test('font pairing switching takes effect correctly without style-breaking double quotes', () => {
  const env = createEnv();
  const md = '# 测试标题\n\n这是一段正文。';

  // 1. 全篇宋体
  env.eval("TUNING.fontPair = 'serif'");
  const serifHtml = env.eval(`render(${JSON.stringify(md)})`);
  assert.ok(serifHtml.includes("font-family:'Songti SC'"), 'Serif mode must inject Songti SC font family');
  assert.ok(!serifHtml.includes('font-family:"Songti SC"'), 'Must not contain breaking double quotes in style attribute');
  assert.ok(!serifHtml.includes('font-family:"PingFang SC"'), 'Must not contain PingFang SC when in full serif mode');

  // 2. 现代黑体
  env.eval("TUNING.fontPair = 'sans'");
  const sansHtml = env.eval(`render(${JSON.stringify(md)})`);
  assert.ok(sansHtml.includes("font-family:-apple-system,BlinkMacSystemFont,'PingFang SC'"), 'Sans mode must inject PingFang SC');
  assert.ok(!sansHtml.includes("font-family:'Songti SC'"), 'Sans mode must not have Songti SC in body or heading');

  // 3. 宋体标+黑体文
  env.eval("TUNING.fontPair = 'mixed'");
  const mixedHtml = env.eval(`render(${JSON.stringify(md)})`);
  assert.ok(mixedHtml.includes("<h1 style=\"margin:0 0 16px;color:#1E1D1B;font-family:'Songti SC'"), 'Mixed mode heading must be Songti SC');
  assert.ok(mixedHtml.includes("font-family:-apple-system,BlinkMacSystemFont,'PingFang SC'"), 'Mixed mode body must be PingFang SC');
});

test('wechat-formatter layout supports split scroll and sticky headers', () => {
  assert.ok(html.includes('class="workspace-sticky-header"'), 'Must have workspace-sticky-header');
  assert.ok(html.includes('class="preview-sticky-header"'), 'Must have preview-sticky-header');
  assert.ok(html.includes('class="editor-wrap"'), 'Must have editor-wrap');
  assert.ok(html.includes('.workspace-sticky-header'), 'CSS must define workspace-sticky-header');
  assert.ok(html.includes('.preview-sticky-header'), 'CSS must define preview-sticky-header');
  assert.ok(html.includes('position: sticky'), 'Must use sticky positioning for toolbar headers');
});

test('wechat-formatter contains focus-visible, reduced motion and roving tabindex for mobile tabs', () => {
  assert.ok(html.includes(':focus-visible'), 'CSS must define focus-visible styles');
  assert.ok(html.includes('prefers-reduced-motion'), 'CSS must define prefers-reduced-motion');
  assert.ok(html.includes('tabindex="0"'), 'Active mobile tab must have initial tabindex 0');
  assert.ok(html.includes('tabindex="-1"'), 'Inactive mobile tab must have initial tabindex -1');
  assert.ok(html.includes("e.key === 'ArrowRight'"), 'Mobile tabs must handle ArrowRight keyboard navigation');
  assert.ok(html.includes("e.key === 'ArrowLeft'"), 'Mobile tabs must handle ArrowLeft keyboard navigation');
});

test('external links convert to deduplicated footnotes by default and respect linkToFootnote toggle', () => {
  const env = createEnv();
  const md = '参考[SEC 公告](https://www.sec.gov/8k)与[另一处](https://www.sec.gov/8k)以及[工具](/tools/preflop-range/)。';
  const withFootnotes = env.eval(`render(${JSON.stringify(md)})`);
  assert.ok(!withFootnotes.includes('<a href='), 'Should replace <a> tags when linkToFootnote is enabled');
  assert.ok(withFootnotes.includes('[1]'), 'Must assign footnote number [1]');
  assert.ok(withFootnotes.includes('[2]'), 'Must assign footnote number [2]');
  assert.ok(!withFootnotes.includes('[3]'), 'Duplicate URL https://www.sec.gov/8k must deduplicate');
  assert.ok(withFootnotes.includes('参考与注释'), 'Must append Reference & Footnotes section');
  assert.ok(withFootnotes.includes('https://shiliang.me/tools/preflop-range/'), 'Relative site link must resolve to https://shiliang.me');

  env.eval('TUNING.linkToFootnote = false');
  const rawLinks = env.eval(`render(${JSON.stringify(md)})`);
  assert.ok(rawLinks.includes('<a href="https://www.sec.gov/8k"'), 'Should render normal <a> when linkToFootnote is false');
  assert.ok(!rawLinks.includes('参考与注释'), 'Should omit empty reference section when no footnotes rendered');
});

test('standard markdown [^id] footnotes render superscripts and bottom reference notes', () => {
  const env = createEnv();
  const md = '凯利公式指出最佳下注比例[^1]。\n\n[^1]: Kelly, J. L. (1956), Bell System Technical Journal.';
  const rendered = env.eval(`render(${JSON.stringify(md)})`);
  assert.ok(rendered.includes('>[1]</sup>'), 'Must render superscript [1]');
  assert.ok(rendered.includes('参考与注释'), 'Must render bottom reference block');
  assert.ok(rendered.includes('Kelly, J. L. (1956)'), 'Must include footnote definition body');
  assert.ok(!rendered.includes('[^1]:'), 'Raw footnote definition line must not leak into body');
});

test('multiline blockquotes with blank lines and lists render as a single cohesive blockquote', () => {
  const env = createEnv();
  const md = '> **上头复位卡**\n>\n> - **触发事件**：亏损后冲动\n> - **复位条件**：冷静5分钟';
  const rendered = env.eval(`render(${JSON.stringify(md)})`);
  assert.equal((rendered.match(/<blockquote/g) || []).length, 1, 'Multi-line quote must render as ONE blockquote');
  assert.ok(!rendered.includes('&gt;'), 'Must not leak raw > symbols');
  assert.ok(rendered.includes('上头复位卡') && rendered.includes('触发事件') && rendered.includes('•'), 'Inner list and text must render inside blockquote');
});

test('table <br>, site-relative images and unresolved local image placeholders render cleanly', () => {
  const env = createEnv();
  const md = [
    '| 类型 | 说明 |',
    '| :--- | :--- |',
    '| **紧凶** | 第一行<br>第二行 |',
    '',
    '![关系图](/assets/images/posts/preflop-range-ev/hand-role-conditions-blog.png)',
    '*图注：牌力与位置关系图*',
    '',
    '![本地草图](./draft-chart.png)'
  ].join('\n');
  const rendered = env.eval(`render(${JSON.stringify(md)})`);
  assert.ok(rendered.includes('第一行<br>第二行'), 'Table <br> must render as HTML line break, not escaped text');
  assert.ok(!rendered.includes('&lt;br&gt;'), 'Must not escape <br> inside table cells');
  assert.ok(rendered.includes('src="https://shiliang.me/assets/images/posts/preflop-range-ev/hand-role-conditions-blog.png"'), '/assets/ path must resolve to https://shiliang.me');
  assert.ok(rendered.includes('图注：牌力与位置关系图') && rendered.includes('text-align:center'), 'Figure caption must render centered');
  assert.ok(rendered.includes('待在公众号补图') && rendered.includes('./draft-chart.png'), 'Unresolved local path must render dashed placeholder card');
});

test('inline code protection, strikethrough, H4 and code indentation work properly', () => {
  const env = createEnv();
  const md = [
    '#### 四级小标题',
    '',
    '行内代码 `2*3*4` 与 `==unchanged==` 以及 ~~旧看法~~。',
    '',
    '```js',
    '  const x = 1;',
    '```'
  ].join('\n');
  const rendered = env.eval(`render(${JSON.stringify(md)})`);
  assert.ok(rendered.includes('<h4 '), 'Must support H4 heading');
  assert.ok(rendered.includes('>2*3*4</code>'), 'Asterisks inside inline code must not trigger italic');
  assert.ok(!rendered.includes('<em>3</em>'), 'Must not italicize inside inline code');
  assert.ok(rendered.includes('<del ') && rendered.includes('旧看法</del>'), 'Must render strikethrough');
  assert.ok(rendered.includes('&nbsp;&nbsp;const x = 1;'), 'Code block must preserve leading indentation via &nbsp;');
});

test('formatPangu inserts spacing cleanly while skipping front matter, code and URLs', () => {
  const env = createEnv();
  const md = [
    '---',
    'title: "200BB测试"',
    '---',
    '',
    '在200BB以上现金桌查看[SEC8K文件](https://sec.gov/test2026)和 `Q3财报` 指标：',
    '',
    '```js',
    'const x = "中文200测试";',
    '```'
  ].join('\n');
  const spaced = env.eval(`formatPangu(${JSON.stringify(md)})`);
  assert.ok(spaced.includes('title: "200BB测试"'), 'Must leave YAML front matter untouched');
  assert.ok(spaced.includes('在 200BB 以上现金桌'), 'Must add spaces around numbers/Latin in prose');
  assert.ok(spaced.includes('(https://sec.gov/test2026)'), 'Must keep URL untouched');
  assert.ok(spaced.includes('`Q3财报`'), 'Must keep inline code untouched');
  assert.ok(spaced.includes('const x = "中文200测试";'), 'Must keep fenced code block untouched');
  assert.equal(env.eval(`formatPangu(${JSON.stringify(spaced)})`), spaced, 'formatPangu must be idempotent');
});

test('computeStats ignores YAML front matter and Markdown syntax for word count and reading time', () => {
  const env = createEnv();
  const md = '---\ntitle: "测试标题"\ndescription: "摘要信息"\n---\n# 标题\n\n你好 world，这是测试文本。\n\n![图](https://example.com/a.png)';
  const stats = JSON.parse(JSON.stringify(env.eval(`computeStats(${JSON.stringify(md)})`)));
  assert.equal(stats.words, 11, 'Must count 10 CJK chars + 1 English word and exclude YAML/URLs');
  assert.equal(stats.minutes, 1, 'Non-empty post must estimate at least 1 minute');

  const emptyStats = JSON.parse(JSON.stringify(env.eval('computeStats("")')));
  assert.deepEqual(emptyStats, { words: 0, minutes: 0 }, 'Empty input must have 0 words and 0 minutes');
});

test('cleared empty source in localStorage stays empty on reload instead of reviving sample', () => {
  const env = createEnv({ 'positive-ev-wechat-source': '' });
  assert.equal(env.mockElements.source.value, '', 'Explicitly cleared empty source must remain empty');
});

