const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/investment-checklist/index.html'), 'utf8');

test('investment-checklist DOM contains required action buttons, samples and risk fields', () => {
  assert.ok(html.includes('id="saveBtn"'), 'Must contain saveBtn');
  assert.ok(html.includes('id="copyMdBtn"'), 'Must contain copyMdBtn');
  assert.ok(html.includes('id="downloadMdBtn"'), 'Must contain downloadMdBtn');
  assert.ok(html.includes('id="copyBtn"'), 'Must contain copyBtn');
  assert.ok(html.includes('id="printBtn"'), 'Must contain printBtn');
  assert.ok(html.includes('id="resetBtn"'), 'Must contain resetBtn');
  assert.ok(html.includes('id="loadPaypalSampleBtn"'), 'Must contain loadPaypalSampleBtn');
  assert.ok(html.includes('id="loadLiteSampleBtn"'), 'Must contain loadLiteSampleBtn');
  assert.ok(!html.includes('name="ev_premortem"'), 'Must NOT contain ev_premortem in full checklist');
  assert.ok(!html.includes('data-bind="ev_premortem"'), 'Must NOT contain ev_premortem in simple checklist');
  assert.ok(!html.includes('事前验尸'), 'Must NOT contain 事前验尸 text anywhere');
  assert.ok(html.includes('name="size_hard_cap"'), 'Must contain size_hard_cap in full checklist');
  assert.ok(html.includes('data-bind="size_hard_cap"'), 'Must contain size_hard_cap in simple checklist');
  assert.ok(html.includes('name="size_max_pain"'), 'Must contain size_max_pain in full checklist');
  assert.ok(html.includes('data-bind="size_max_pain"'), 'Must contain size_max_pain in simple checklist');
  assert.ok(html.includes('复制 Markdown'), 'copyMdBtn label must be present');
  assert.ok(html.includes('下载 .md'), 'downloadMdBtn label must be present');
});

function createChecklistEnv(initialData = {}, initialMode = 'full') {
  const store = {};
  const mockData = {
    context_date: '2026-07-15',
    context_asset: 'Lumentum (LITE)',
    context_horizon: '中期趋势观察 / 小仓试错',
    context_market: 'AI 光通信板块极其火热，自身出现明显 FOMO 情绪',
    ev_judgement: 'Lumentum 受益于 800G/1.6T 光互连需求放量，NVIDIA 战略协议锁定高增长',
    ev_market_knows: 'AI 数据中心光互连需求爆发已获市场充分共识，估值已透支乐观预期',
    ev_difference: '战略合作中的联合投资与产能绑定具备极高的业绩确定性',
    reason_1: '产业合作硬事实：NVIDIA 与 Lumentum 宣布多年战略合作',
    reason_2: '真实财务兑现：FY2026 Q3 收入达 8.084 亿美元（同比 +90.1%）',
    reason_3: '核心器件壁垒：高端 EML / CW 光源芯片领域具备稀缺产能',
    valuation_level: '中性偏贵',
    valuation_metrics: '动态 PE > 28x',
    valuation_priced_in: '已提前透支未来 1 年产能拉满的最乐观场景',
    valuation_support: '季度收入必须保持环比增长且营业利润率维持在 30% 以上',
    size_role: '观察试错仓',
    size_hard_cap: '总资金严卡 3% 上限',
    size_max_pain: '最大容忍浮亏 18% 或绝对金额不超过 ¥15,000',
    size_not_more: '估值偏高、客户集中度高，任何经营微瑕都会引发剧烈杀估值',
    size_not_less: '具备硬事实与真实业绩兑现的主线机会，值得保留少量筹码保持敏感度',
    size_downside: '即便遭遇 20% 极端跌幅，对总账户净值影响仅约 0.5%，心态平和',
    entry_1_name: '首笔试探',
    entry_1_trigger: '约 $900 附近（战略合作公告后）',
    entry_1_action: '轻仓试探介入，核对 Q3 真实财报',
    entry_1_size: '1.5%',
    entry_2_name: '强化追加',
    entry_2_trigger: '价格回调至约 $800，且 Q3 财报确认营业利润率达 32.2%',
    entry_2_action: '业绩兑现得到新数据验证后，小幅补齐至上限，随后锁死不再加仓',
    entry_2_size: '3.0%',
    exit_review: '每季度财报后',
    exit_event: '季度出货指引及光芯片综合毛利率变动',
    exit_invalidated: '毛利率跌破 25% 或战略采购协议执行出现松动',
    exit_logic_action: '果断清仓离场，绝不以“AI 长期前景好”为借口死扛',
    profit_rule_1: '若股价短期再涨 40% 导致动态 PE > 40x，削峰减持 1/2 收回本金',
    profit_rule_2: '若单标的因暴涨市值占比突破 4.5%，被动削减至 3% 试错上限',
    exit_emotion: '警惕在行业最火热时把试探仓擅自加成重仓',
    done_hypothesis: true,
    done_hard_cap: true,
    done_no_averaging_down: true,
    done_exit: true,
    ...initialData
  };

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'Must contain <script> block');
  const code = scriptMatch[1].replace('const fields =', 'let fields =');

  const window = {
    toolAnalytics: { action: () => {}, complete: () => {} },
    location: { origin: 'https://shiliang.me', pathname: '/tools/investment-checklist/' }
  };
  const mockForm = {
    querySelector: () => ({ value: '' }),
    querySelectorAll: () => [],
    addEventListener: () => {},
    reset: () => {}
  };
  const document = {
    querySelector: (selector) => {
      if (selector === '#checklist') return mockForm;
      return {
        addEventListener: () => {},
        querySelectorAll: () => [],
        querySelector: () => ({ value: '' }),
        reset: () => {},
        textContent: '',
        value: '',
        setAttribute: () => {}
      };
    },
    querySelectorAll: () => [],
    createElement: () => ({ value: '', style: {}, select: () => {}, remove: () => {} }),
    body: { appendChild: () => {}, dataset: { mode: initialMode } }
  };
  const localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };

  const context = vm.createContext({
    window,
    document,
    localStorage,
    navigator: { clipboard: { writeText: async () => {} } },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
    Blob: class { constructor(parts) { this.parts = parts; } },
    confirm: () => true,
    setTimeout: (fn) => fn()
  });

  // Inject a helper to expose internal functions and samples
  const wrappedCode = code + '\n;globalThis.__test_exports = { buildFullMarkdown, buildSimpleMarkdown, buildMarkdown, getFilename, SAMPLES, loadSample, migrateData, buildFullText, buildSimpleText };';
  vm.runInContext(wrappedCode, context);
  return { context, exports: context.__test_exports, mockData };
}

test('SAMPLES contains authentic paypal and lite cases from blog essays', () => {
  const { exports } = createChecklistEnv();
  assert.ok(exports.SAMPLES.paypal, 'Must contain paypal sample');
  assert.ok(exports.SAMPLES.lite, 'Must contain lite sample');
  assert.equal(exports.SAMPLES.paypal.context_asset, 'PayPal (PYPL)');
  assert.ok(exports.SAMPLES.paypal.reason_1.includes('全球双边网络'));
  assert.ok(exports.SAMPLES.paypal.size_hard_cap.includes('5%'));
  assert.equal(exports.SAMPLES.lite.context_asset, 'Lumentum (LITE)');
  assert.ok(exports.SAMPLES.lite.reason_2.includes('8.084 亿美元'));
  assert.ok(exports.SAMPLES.lite.size_hard_cap.includes('3%'));
});

test('buildFullMarkdown generates valid Front Matter, Hard Cap and GFM table structure', () => {
  const { context, exports, mockData } = createChecklistEnv();
  vm.runInContext(`fields = () => (${JSON.stringify(mockData)}); mode = 'full';`, context);

  const md = exports.buildFullMarkdown();
  assert.ok(md.startsWith('---\n'), 'Must start with Front Matter ---');
  assert.ok(md.includes('title: "投资决策检查清单 - Lumentum (LITE)"'), 'Front Matter title must contain asset');
  assert.ok(md.includes('date: "2026-07-15"'), 'Front Matter date must match');
  assert.ok(md.includes('asset: "Lumentum (LITE)"'), 'Front Matter asset must match');
  assert.ok(md.includes('horizon: "中期趋势观察 / 小仓试错"'), 'Front Matter horizon must match');
  assert.ok(md.includes('role: "观察试错仓"'), 'Front Matter role must match');
  assert.ok(md.includes('hard_cap: "总资金严卡 3% 上限"'), 'Front Matter hard_cap must match');
  assert.ok(md.includes('max_pain: "最大容忍浮亏 18% 或绝对金额不超过 ¥15,000"'), 'Front Matter max_pain must match');
  assert.ok(!md.includes('pre_mortem:'), 'Front Matter must NOT contain pre_mortem');
  assert.ok(md.includes('type: "investment-checklist"'), 'Front Matter type must match');
  assert.ok(md.includes('mode: "full"'), 'Front Matter mode must match');
  assert.ok(md.includes('source: "https://shiliang.me/tools/investment-checklist/"'), 'Front Matter source must match');

  // Verify Headers and Quotes
  assert.ok(md.includes('# 投资决策检查清单 - Lumentum (LITE)（完整研究版）'), 'H1 heading must match');
  assert.ok(md.includes('## 00 / CONTEXT 决策背景'), 'H2 CONTEXT must exist');
  assert.ok(md.includes('## 01 / EV 核心命题与三大支柱'), 'H2 EV must exist');
  assert.ok(!md.includes('事前验尸'), 'Pre-mortem must NOT exist in Full Markdown');
  assert.ok(md.includes('## 02 / SIZE 组合角色与硬纪律边界'), 'H2 SIZE must exist');
  assert.ok(md.includes('🔥 仓位硬顶上限 (Hard Cap)'), 'Hard Cap must be present');
  assert.ok(md.includes('🔥 最大容忍亏损 (Max Pain)'), 'Max Pain must be present');
  assert.ok(md.includes('## 03 / EXIT 出场、削峰与冷静纪律'), 'H2 EXIT must exist');

  // Verify GFM Tables
  assert.ok(md.includes('| 阶段 | 触发条件 | 必须验证的基本面事实与动作 | 阶段后仓位 (≤ Hard Cap) |'), '建仓计划表格表头必须存在');
  assert.ok(md.includes('|---|---|---|---|'), '建仓计划表格分割线必须存在');
  assert.ok(md.includes('| 首笔试探 | 约 $900 附近（战略合作公告后） | 轻仓试探介入，核对 Q3 真实财报 | 1.5% |'), '首笔建仓计划数据必须格式化');

  // Verify Checklist Checkboxes
  assert.ok(md.includes('- [x] 我锁死了仓位硬顶上限（Hard Cap）与最大容忍亏损'), 'Checked items must be [x]');
});

test('buildSimpleMarkdown generates concise cooldown Markdown structure', () => {
  const { context, exports, mockData } = createChecklistEnv();
  vm.runInContext(`fields = () => (${JSON.stringify(mockData)}); mode = 'simple';`, context);

  const md = exports.buildSimpleMarkdown();
  assert.ok(md.startsWith('---\n'), 'Must start with Front Matter');
  assert.ok(md.includes('mode: "simple"'), 'Front Matter mode must be simple');
  assert.ok(md.includes('hard_cap: "总资金严卡 3% 上限"'), 'Front Matter hard_cap must be present');
  assert.ok(md.includes('# 投资决策检查清单 - Lumentum (LITE)（极简防冲动版）'), 'H1 heading must be 极简防冲动版');
  assert.ok(md.includes('## 01 / EV 核心命题'), 'EV heading must match simple mode');
  assert.ok(!md.includes('事前验尸'), 'Pre-mortem must NOT be in simple mode');
  assert.ok(md.includes('## 02 / SIZE 仓位硬顶与最大容忍亏损'), 'SIZE heading must match simple mode');
  assert.ok(md.includes('🔥 仓位硬顶上限 (Hard Cap)'), 'Hard Cap must be in simple mode');
  assert.ok(md.includes('## 03 / EXIT 逻辑失效与出场约束'), 'EXIT heading must match simple mode');
});

test('migrateData smoothly migrates legacy v3 / v2 / v1 data to v4', () => {
  const { exports } = createChecklistEnv();
  const legacyV3 = {
    __version: 3,
    context_asset: 'BABA',
    risk_1: '电商竞争加剧',
    risk_2: '云业务放缓',
    size_limit: '5%',
    stage_1_name: '第一笔',
    stage_1_trigger: '$70',
    stage_1_action: '观察',
    stage_1_size: '2%',
    profit_1_trigger: '$100',
    profit_1_action: '减持',
    profit_1_keep: '2%'
  };
  const migrated = exports.migrateData(legacyV3);
  assert.equal(migrated.__version, 4);
  assert.equal(migrated.context_asset, 'BABA');
  assert.equal(migrated.size_hard_cap, '5%');
  assert.equal(migrated.entry_1_trigger, '$70');
  assert.equal(migrated.entry_1_size, '2%');
  assert.ok(migrated.profit_rule_1.includes('$100 ｜ 动作：减持 ｜ 保留：2%'));
});

test('getFilename sanitizes special characters and includes asset and date', () => {
  const { context, exports } = createChecklistEnv();

  vm.runInContext(`fields = () => ({ context_asset: 'AAPL/US?*', context_date: '2026-09-13' });`, context);
  assert.equal(exports.getFilename(), '投资检查清单-AAPL_US__-2026-09-13.md');

  vm.runInContext(`fields = () => ({ context_asset: '', context_date: '2026-09-13' });`, context);
  assert.equal(exports.getFilename(), '投资检查清单-2026-09-13.md');
});
