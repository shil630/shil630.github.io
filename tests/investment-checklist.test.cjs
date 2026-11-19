const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/investment-checklist/index.html'), 'utf8');

test('investment-checklist DOM contains required gate controls, calculator inputs and handoff card', () => {
  assert.ok(html.includes('id="saveBtn"'), 'Must contain saveBtn');
  assert.ok(html.includes('id="copyMdBtn"'), 'Must contain copyMdBtn');
  assert.ok(html.includes('id="downloadMdBtn"'), 'Must contain downloadMdBtn');
  assert.ok(html.includes('id="copyBtn"'), 'Must contain copyBtn');
  assert.ok(html.includes('id="printBtn"'), 'Must contain printBtn');
  assert.ok(html.includes('id="resetBtn"'), 'Must contain resetBtn');
  assert.ok(html.includes('id="loadPaypalSampleBtn"'), 'Must contain loadPaypalSampleBtn');
  assert.ok(html.includes('id="loadLiteSampleBtn"'), 'Must contain loadLiteSampleBtn');
  assert.ok(html.includes('name="size_hard_cap"'), 'Must contain size_hard_cap input');
  assert.ok(html.includes('name="calc_portfolio"'), 'Must contain calc_portfolio input');
  assert.ok(html.includes('name="calc_stop_pct"'), 'Must contain calc_stop_pct input');
  assert.ok(html.includes('name="size_max_pain"'), 'Must contain size_max_pain input');
  assert.ok(!html.includes('ev_premortem'), 'Must NOT contain ev_premortem');
  assert.ok(!html.includes('事前验尸'), 'Must NOT contain 事前验尸 text');
  assert.ok(html.includes('复制 Markdown'), 'copyMdBtn label must be present');
  assert.ok(html.includes('下载 .md'), 'downloadMdBtn label must be present');
  assert.ok(html.includes('https://thesisee.com'), 'Must include ThesisSee post-trade handoff link');
});

function createChecklistEnv() {
  const store = {};
  const stubEl = () => ({
    value: '',
    textContent: '',
    dataset: {},
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    addEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => null,
    appendChild: () => {},
    setAttribute: () => {},
    select: () => {},
    remove: () => {}
  });

  const window = {
    toolAnalytics: { action: () => {}, complete: () => {} },
    location: { origin: 'https://shiliang.me', pathname: '/tools/investment-checklist/' },
    clearTimeout: () => {},
    setTimeout: () => 1,
    print: () => {}
  };
  const mockForm = {
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    reset: () => {}
  };
  const document = {
    querySelector: (selector) => (selector === '#checklist' ? mockForm : stubEl()),
    getElementById: () => stubEl(),
    querySelectorAll: () => [],
    createElement: () => stubEl(),
    execCommand: () => true,
    body: stubEl()
  };
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'Must contain <script> block');
  const code = scriptMatch[1]
    .replace('const fields =', 'let fields =')
    .replace('let selectedEmotions =', 'var selectedEmotions =');

  const context = vm.createContext({
    window,
    document,
    localStorage,
    navigator: { clipboard: { writeText: async () => {} } },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
    Blob: class { constructor(parts) { this.parts = parts; } },
    confirm: () => true,
    setTimeout: (fn) => 1
  });

  const wrappedCode = code + '\n;globalThis.__test_exports = { calculateRisk, evaluateGate, buildMarkdown, buildText, getFilename, SAMPLES, loadSample, migrateData, parseNum, formatMoney };';
  vm.runInContext(wrappedCode, context);
  return { context, exports: context.__test_exports, store };
}

test('calculateRisk accurately computes position, max pain, portfolio impact, breakeven and R:R', () => {
  const { exports } = createChecklistEnv();

  const liteRisk = exports.calculateRisk({
    calc_currency: '$',
    calc_portfolio: '100000',
    size_hard_cap: '3',
    calc_stop_pct: '18',
    calc_upside_pct: '45'
  });
  assert.equal(liteRisk.positionAmount, 3000);
  assert.equal(liteRisk.maxPainAmount, 540);
  assert.ok(Math.abs(liteRisk.portfolioImpactPct - 0.54) < 0.001);
  assert.ok(Math.abs(liteRisk.breakevenPct - 21.9512) < 0.01);
  assert.equal(liteRisk.rrRatio, 2.5);
  assert.equal(liteRisk.impactLevel, 'ok');

  const paypalRisk = exports.calculateRisk({
    calc_currency: '¥',
    calc_portfolio: '200000',
    size_hard_cap: '15',
    calc_stop_pct: '35'
  });
  assert.equal(paypalRisk.positionAmount, 30000);
  assert.equal(paypalRisk.maxPainAmount, 10500);
  assert.ok(Math.abs(paypalRisk.portfolioImpactPct - 5.25) < 0.001);
  assert.equal(paypalRisk.impactLevel, 'danger');
});

test('evaluateGate enforces hold, caution and ready verdicts accurately', () => {
  const { exports } = createChecklistEnv();

  // Hold: PayPal sample (exceeds 3% impact + averaging emotion)
  const paypalVerdict = exports.evaluateGate(exports.SAMPLES.paypal);
  assert.equal(paypalVerdict.status, 'hold', 'PayPal sample must trigger hold gate');
  assert.equal(paypalVerdict.checks.size.state, 'danger');
  assert.equal(paypalVerdict.checks.emotion.state, 'danger');

  // Caution: LITE sample (sound size, but has FOMO emotion)
  const liteVerdict = exports.evaluateGate(exports.SAMPLES.lite);
  assert.equal(liteVerdict.status, 'caution', 'LITE sample with FOMO must trigger caution gate');
  assert.equal(liteVerdict.checks.size.state, 'ok');
  assert.equal(liteVerdict.checks.emotion.state, 'warn');

  // Ready: LITE with calm emotion
  const readyData = { ...exports.SAMPLES.lite, emotion_flags: ['calm'] };
  const readyVerdict = exports.evaluateGate(readyData);
  assert.equal(readyVerdict.status, 'ready', 'Calm + sound sizing + full EV/EXIT must trigger ready');

  // Caution on weak R:R < 1.5
  const weakRrData = { ...readyData, calc_upside_pct: '20' }; // 20 / 18 = 1.11x < 1.5x
  const weakRrVerdict = exports.evaluateGate(weakRrData);
  assert.equal(weakRrVerdict.status, 'caution', 'R:R below 1.5x should warn with caution');
});

test('buildMarkdown includes v5 gate verdict, risk math table and conditional deep notes', () => {
  const { context, exports } = createChecklistEnv();
  const sample = { ...exports.SAMPLES.lite, emotion_flags: ['calm'] };
  vm.runInContext(`selectedEmotions = new Set(${JSON.stringify(sample.emotion_flags)}); fields = () => (${JSON.stringify(sample)});`, context);

  const md = exports.buildMarkdown();
  assert.ok(md.startsWith('---\n'), 'Must start with Front Matter');
  assert.ok(md.includes('asset: "Lumentum (LITE)"'));
  assert.ok(md.includes('verdict: "ready"'));
  assert.ok(md.includes('hard_cap_pct: "3"'));
  assert.ok(md.includes('max_pain_amount: "$540"'));
  assert.ok(md.includes('portfolio_impact_pct: "0.54"'));
  assert.ok(md.includes('rr_ratio: "2.50"'));
  assert.ok(md.includes('| **🔥 最大痛感亏损 (Max Pain)** | **-$540** |'));
  assert.ok(md.includes('## 进阶研究附表'));
  assert.ok(!md.includes('事前验尸'));

  // Minimal record without deep notes must omit deep notes section
  const minimal = {
    context_date: '2026-11-19',
    context_asset: 'AAPL',
    size_role: '观察试错仓',
    calc_currency: '$',
    calc_portfolio: '100000',
    size_hard_cap: '5',
    calc_stop_pct: '15',
    ev_judgement: '服务收入增长具备强粘性支撑估值',
    exit_invalidated: '服务增速连续两季跌破 8%',
    emotion_flags: ['calm']
  };
  vm.runInContext(`selectedEmotions = new Set(['calm']); fields = () => (${JSON.stringify(minimal)});`, context);
  const minimalMd = exports.buildMarkdown();
  assert.ok(!minimalMd.includes('## 进阶研究附表'), 'Empty deep notes should be omitted from Markdown');
});

test('migrateData upgrades v4 string Hard Cap and legacy v3/v2/v1 records to v5 cleanly', () => {
  const { exports } = createChecklistEnv();

  const legacyV4 = {
    __version: 4,
    context_asset: 'NVDA',
    size_hard_cap: '总资金严卡 5% 上限',
    ev_judgement: 'AI 算力需求继续扩张',
    exit_invalidated: '资本开支大幅下修'
  };
  const upgradedV4 = exports.migrateData(legacyV4);
  assert.equal(upgradedV4.__version, 5);
  assert.equal(upgradedV4.size_hard_cap, '5');
  assert.equal(upgradedV4.size_max_pain, '总资金严卡 5% 上限');

  const legacyV3 = {
    __version: 3,
    context_asset: 'BABA',
    size_limit: '8%',
    stage_1_trigger: '$70',
    stage_1_size: '2%',
    profit_1_trigger: '$100',
    profit_1_action: '减持',
    profit_1_keep: '2%'
  };
  const upgradedV3 = exports.migrateData(legacyV3);
  assert.equal(upgradedV3.__version, 5);
  assert.equal(upgradedV3.size_hard_cap, '8');
  assert.equal(upgradedV3.entry_1_trigger, '$70');
  assert.ok(upgradedV3.profit_rule_1.includes('$100 ｜ 动作：减持'));
});

test('getFilename sanitizes special characters and includes asset and date', () => {
  const { context, exports } = createChecklistEnv();

  vm.runInContext(`fields = () => ({ context_asset: 'AAPL/US?*', context_date: '2026-09-13', emotion_flags: [] });`, context);
  assert.equal(exports.getFilename(), '投资检查清单-AAPL_US__-2026-09-13.md');

  vm.runInContext(`fields = () => ({ context_asset: '', context_date: '2026-09-13', emotion_flags: [] });`, context);
  assert.equal(exports.getFilename(), '投资检查清单-2026-09-13.md');
});

test('investment-checklist contains accessible focus-visible styles and reduced motion query', () => {
  assert.ok(html.includes(':focus-visible'), 'CSS must define focus-visible styles');
  assert.ok(html.includes('prefers-reduced-motion'), 'CSS must define prefers-reduced-motion media query');
});
