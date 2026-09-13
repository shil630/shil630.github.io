const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/investment-checklist/index.html'), 'utf8');

test('investment-checklist DOM contains required action buttons', () => {
  assert.ok(html.includes('id="saveBtn"'), 'Must contain saveBtn');
  assert.ok(html.includes('id="copyMdBtn"'), 'Must contain copyMdBtn');
  assert.ok(html.includes('id="downloadMdBtn"'), 'Must contain downloadMdBtn');
  assert.ok(html.includes('id="copyBtn"'), 'Must contain copyBtn');
  assert.ok(html.includes('id="printBtn"'), 'Must contain printBtn');
  assert.ok(html.includes('id="resetBtn"'), 'Must contain resetBtn');
  assert.ok(html.includes('复制 Markdown'), 'copyMdBtn label must be present');
  assert.ok(html.includes('下载 .md'), 'downloadMdBtn label must be present');
});

function createChecklistEnv(initialData = {}, initialMode = 'full') {
  const store = {};
  const mockData = {
    context_date: '2026-09-13',
    context_asset: 'PayPal',
    context_horizon: '3-5 年',
    context_market: '板块冷清，市场担心竞争加剧',
    ev_judgement: '自由现金流收益率超过 8%，且核心结账按钮份额保持稳定',
    ev_market_knows: 'Apple Pay 侵蚀份额，利润率承压',
    ev_difference: '品牌结账场景与 Braintree 处理量依然具有强网络效应',
    reason_1: '全球双边网络，活跃账户数超过 4 亿',
    reason_2: '年产生超过 50 亿美元自由现金流',
    reason_3: '管理层开启大额股份回购',
    reason_4: '降本增效，营业利润率见底回升',
    reason_5: '估值处于历史最低分位数',
    risk_1: '无密码快捷结账竞争进一步加剧',
    risk_2: '非品牌处理费率较低削弱毛利',
    risk_3: '宏观消费走弱拖累总处理量',
    risk_4: '新管理层执行力不达预期',
    risk_5: '监管政策对跨境支付的约束',
    valuation_level: '明显偏低',
    valuation_metrics: 'P/FCF < 12x',
    valuation_priced_in: '计入了零增长与持续份额丢失',
    valuation_support: '保持 5% 自由现金流年化复合增长',
    size_role: '核心',
    size_limit: '总仓位 8%',
    size_not_more: '竞争格局尚在动态演化中',
    size_not_less: '赔率极佳，下行保护强',
    size_downside: '跌幅 30%，承受浮亏时间 1-2 年',
    stage_1_name: '第一笔试探',
    stage_1_trigger: '$58 以下',
    stage_1_action: '建仓观察，跟踪结账量',
    stage_1_size: '2%',
    stage_2_name: '第二笔加仓',
    stage_2_trigger: '$52 以下且财报验证回购',
    stage_2_action: '加仓至目标中值',
    stage_2_size: '5%',
    stage_3_name: '第三笔核心买入',
    stage_3_trigger: '$48 以下且现金流超预期',
    stage_3_action: '打满上限',
    stage_3_size: '8%',
    stage_4_name: '深度机会',
    stage_4_trigger: '极端恐慌情绪',
    stage_4_action: '评估是否有不可逆损伤后决定',
    stage_4_size: '8%',
    stage_5_name: '不参与区',
    stage_5_trigger: '$75 以上',
    stage_5_action: '不再追买',
    stage_5_size: '0',
    exit_review: '每季度财报后',
    exit_event: '核心品牌结账量连续两个季度负增长',
    exit_invalidated: '活跃商户数持续流失且自由现金流同比下滑超过 15%',
    exit_logic_action: '坚决清仓退出，不抱侥幸',
    profit_1_name: '第一目标区',
    profit_1_trigger: '估值恢复至 18x P/FCF',
    profit_1_action: '削峰减半，收回本金',
    profit_1_keep: '4%',
    profit_2_name: '第二目标区',
    profit_2_trigger: '估值超过 25x P/FCF',
    profit_2_action: '继续削减至观察仓',
    profit_2_keep: '2%',
    profit_3_name: '长期持有条件',
    profit_3_trigger: '每年自由现金流增速 > 10%',
    profit_3_action: '只要逻辑未受损则长期持有',
    profit_3_keep: '核心仓',
    price_alert_1: '跌破 $50',
    price_action_1: '复核是否有新的恶化事实',
    price_role_1: '不盲目补仓',
    price_alert_2: '单月暴涨 30%',
    price_action_2: '复核是否估值过热',
    price_role_2: '按计划削峰',
    exit_emotion: '怕踏空追高，或者被短线阴跌搞得恐慌割肉',
    done_reasons: true,
    done_risks: true,
    done_valuation: true,
    done_scale: true,
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

  // Inject a helper to expose internal builder functions
  const wrappedCode = code + '\n;globalThis.__test_exports = { buildFullMarkdown, buildSimpleMarkdown, buildMarkdown, getFilename };';
  vm.runInContext(wrappedCode, context);
  return { context, exports: context.__test_exports, mockData };
}

test('buildFullMarkdown generates valid Front Matter and GFM Markdown structure', () => {
  const { context, exports, mockData } = createChecklistEnv();
  // Override fields() in context
  vm.runInContext(`fields = () => (${JSON.stringify(mockData)}); mode = 'full';`, context);

  const md = exports.buildFullMarkdown();
  assert.ok(md.startsWith('---\n'), 'Must start with Front Matter ---');
  assert.ok(md.includes('title: "投资决策检查清单 - PayPal"'), 'Front Matter title must contain asset');
  assert.ok(md.includes('date: "2026-09-13"'), 'Front Matter date must match');
  assert.ok(md.includes('asset: "PayPal"'), 'Front Matter asset must match');
  assert.ok(md.includes('horizon: "3-5 年"'), 'Front Matter horizon must match');
  assert.ok(md.includes('role: "核心"'), 'Front Matter role must match');
  assert.ok(md.includes('type: "investment-checklist"'), 'Front Matter type must match');
  assert.ok(md.includes('mode: "full"'), 'Front Matter mode must match');
  assert.ok(md.includes('source: "https://shiliang.me/tools/investment-checklist/"'), 'Front Matter source must match');

  // Verify Headers and Quotes
  assert.ok(md.includes('# 投资决策检查清单 - PayPal（完整版）'), 'H1 heading must match');
  assert.ok(md.includes('## 00 / CONTEXT 决策背景'), 'H2 CONTEXT must exist');
  assert.ok(md.includes('## 01 / EV 理由、风险与估值'), 'H2 EV must exist');
  assert.ok(md.includes('## 02 / SIZE 组合角色与分批仓位'), 'H2 SIZE must exist');
  assert.ok(md.includes('## 03 / EXIT 止盈、止损与复核'), 'H2 EXIT must exist');

  // Verify GFM Tables
  assert.ok(md.includes('| 阶段 | 价格 / 事件条件 | 证据条件与动作 | 阶段后目标仓位 |'), '建仓计划表格表头必须存在');
  assert.ok(md.includes('|---|---|---|---|'), '建仓计划表格分割线必须存在');
  assert.ok(md.includes('| 第一笔试探 | $58 以下 | 建仓观察，跟踪结账量 | 2% |'), '建仓计划行数据必须格式化');

  assert.ok(md.includes('| 阶段 | 价格 / 估值条件 | 基本面条件与动作 | 预计保留 |'), '止盈计划表格表头必须存在');
  assert.ok(md.includes('| 第一目标区 | 估值恢复至 18x P/FCF | 削峰减半，收回本金 | 4% |'), '止盈计划行数据必须格式化');

  // Verify Checklist Checkboxes
  assert.ok(md.includes('- [x] 我没有把行业热度当成唯一理由'), 'Checked items must be [x]');
  assert.ok(md.includes('- [x] 我写了与理由同等具体的风险'), 'Checked items must be [x]');
});

test('buildSimpleMarkdown generates concise 3-part Markdown structure', () => {
  const { context, exports, mockData } = createChecklistEnv();
  vm.runInContext(`fields = () => (${JSON.stringify(mockData)}); mode = 'simple';`, context);

  const md = exports.buildSimpleMarkdown();
  assert.ok(md.startsWith('---\n'), 'Must start with Front Matter');
  assert.ok(md.includes('mode: "simple"'), 'Front Matter mode must be simple');
  assert.ok(md.includes('# 投资决策检查清单 - PayPal（极简版）'), 'H1 heading must be 极简版');
  assert.ok(md.includes('## 01 / EV 为什么值得参与？'), 'EV heading must match simple mode');
  assert.ok(md.includes('## 02 / SIZE 为什么是这个尺度？'), 'SIZE heading must match simple mode');
  assert.ok(md.includes('## 03 / EXIT 什么会让我行动？'), 'EXIT heading must match simple mode');
  assert.ok(md.includes('支持这个判断的关键证据'), 'Reason_1 must be included');
  assert.ok(md.includes('什么变化会让我更新判断（逻辑失效底线）'), 'Exit_invalidated must be included');
});

test('getFilename sanitizes special characters and includes asset and date', () => {
  const { context, exports } = createChecklistEnv();

  vm.runInContext(`fields = () => ({ context_asset: 'AAPL/US?*', context_date: '2026-09-13' });`, context);
  assert.equal(exports.getFilename(), '投资检查清单-AAPL_US__-2026-09-13.md');

  vm.runInContext(`fields = () => ({ context_asset: '', context_date: '2026-09-13' });`, context);
  assert.equal(exports.getFilename(), '投资检查清单-2026-09-13.md');
});
