// Optional browser regression: NODE_PATH=<Playwright modules> node tests/tool-browser.cjs <production build> [Chrome executable]
// Serves only built files into an isolated context. All analytics collection is intercepted.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const build = path.resolve(process.argv[2]);
const type = file => ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream';
const events = page => page.evaluate(() => Array.from(window.dataLayer || []).filter(e => e[0] === 'event').map(e => [e[1], { ...e[2] }]));

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'https://shiliang.me') return route.abort();
      const file = path.join(build, decodeURIComponent(url.pathname), url.pathname.endsWith('/') ? 'index.html' : '');
      if (!file.startsWith(build + path.sep)) return route.abort();
      try { await route.fulfill({ body: await fs.readFile(file), contentType: type(file) }); }
      catch { await route.fulfill({ status: 404, body: 'Not found' }); }
    });
    await context.addInitScript(() => {
      window.copyMode = 'success';
      const attempt = async () => {
        if (window.copyMode === 'fail') throw new Error('test clipboard denied');
      };
      Object.defineProperty(navigator, 'clipboard', { value: {
        writeText: attempt,
        write: async () => { if (window.copyMode === 'text') throw new Error('test rich text denied'); await attempt(); }
      } });
      document.execCommand = () => false;
      window.print = () => {};
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('https://shiliang.me/tools/investment-checklist/?private=test#secret');
    assert.deepEqual((await events(page)).map(e => e[0]), ['tool_view']);
    await page.locator('[data-bind="context_asset"]').fill('PRIVATE_TEST_INPUT');
    await page.locator('#saveBtn').click();
    assert.ok((await events(page)).some(([e, p]) => e === 'tool_complete' && p.action === 'save'));
    await page.reload();
    assert.equal(await page.locator('[data-bind="context_asset"]').inputValue(), 'PRIVATE_TEST_INPUT');
    assert.deepEqual((await events(page)).map(e => e[0]), ['tool_view']);
    await page.locator('#copyBtn').click();
    assert.equal((await events(page)).filter(e => e[0] === 'tool_complete').length, 1);
    await page.evaluate(() => { window.copyMode = 'fail'; });
    await page.locator('#copyBtn').click();
    await page.locator('#printBtn').click();
    assert.equal((await events(page)).filter(e => e[0] === 'tool_complete').length, 1);
    assert.ok(!JSON.stringify(await events(page)).includes('PRIVATE_TEST_INPUT'));
    console.log('PASS checklist: input, save/restore, copy success/failure, print intent, private data excluded');

    await page.goto('https://shiliang.me/tools/wechat-formatter/');
    assert.deepEqual((await events(page)).map(e => e[0]), ['tool_view']);
    await page.locator('#source').fill('## PRIVATE_TEST_INPUT\n\n| A | B |\n|---|---|\n| 1 | 2 |');
    await page.locator('[data-theme]').nth(1).click();
    await page.locator('#copyBtn').click();
    await page.evaluate(() => { window.copyMode = 'text'; });
    await page.locator('#copyBtn').click();
    await page.evaluate(() => { window.copyMode = 'fail'; });
    await page.locator('#copyBtn').click();
    await page.getByText('复制失败，请手动选择预览文字', { exact: true }).waitFor();
    const download = page.waitForEvent('download');
    await page.locator('#downloadBtn').click();
    assert.equal((await download).suggestedFilename(), '正EV-公众号排版.html');
    assert.deepEqual((await events(page)).filter(e => e[0] === 'tool_complete').map(e => e[1].action), ['copy_rich', 'copy_text', 'download_html']);
    assert.equal(await page.locator('#preview table').count(), 1);
    assert.ok(!JSON.stringify(await events(page)).includes('PRIVATE_TEST_INPUT'));
    console.log('PASS formatter: input, theme, table rendering, rich/plain/failed copy, download initiation');

    await page.goto('https://shiliang.me/tools/preflop-range/');
    assert.deepEqual((await events(page)).map(e => e[0]), ['tool_view']);
    await page.locator('#tab-UTG').press('ArrowRight');
    await page.locator('#matrix [data-hand="AA"]').click();
    await page.locator('#copy-button').click();
    assert.equal((await events(page)).filter(e => e[0] === 'tool_complete').length, 1);
    await page.evaluate(() => { window.copyMode = 'fail'; });
    await page.locator('#copy-button').click();
    assert.equal((await events(page)).filter(e => e[0] === 'tool_complete').length, 1);
    await page.locator('#clear-range').click();
    await page.locator('#restore-range').click();
    assert.ok((await events(page)).some(([e, p]) => e === 'tool_action' && p.action === 'select_position'));
    assert.ok((await events(page)).some(([e, p]) => e === 'tool_action' && p.action === 'edit_range'));
    assert.deepEqual(errors, []);
    console.log('PASS preflop: keyboard selection, edit, copy success/failure, clear/restore; no script errors');
    await context.close();

    // Prove the deployed GTM container consumes the new standard commands.
    // Download public tag scripts only; collect/beacon requests are fulfilled locally.
    const transport = await browser.newContext({ serviceWorkers: 'block' });
    const collected = [];
    await transport.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.endsWith('/collect')) {
        collected.push(request.url() + '\n' + (request.postData() || ''));
        return route.fulfill({ status: 204 });
      }
      if (url.origin === 'https://shiliang.me') {
        const file = path.join(build, url.pathname, url.pathname.endsWith('/') ? 'index.html' : '');
        if (!file.startsWith(build + path.sep)) return route.abort();
        try { return route.fulfill({ body: await fs.readFile(file), contentType: type(file) }); }
        catch { return route.fulfill({ status: 404, body: 'Not found' }); }
      }
      if (url.hostname === 'www.googletagmanager.com' && ['/gtm.js', '/gtag/js'].includes(url.pathname)) return route.continue();
      return route.abort();
    });
    const probe = await transport.newPage();
    await probe.goto('https://shiliang.me/tools/preflop-range/');
    await probe.locator('#tab-UTG').press('ArrowRight');
    await probe.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} } }); });
    await probe.locator('#copy-button').click();
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline && !collected.some(s => s.includes('en=tool_complete'))) await new Promise(r => setTimeout(r, 100));
    for (const event of ['tool_view', 'tool_start', 'tool_action', 'tool_complete']) {
      assert.ok(collected.some(s => s.includes('tid=G-MQH963M94G') && s.includes('en=' + event) && s.includes('ep.tool_id=preflop-range')), 'GTM did not generate collect for ' + event);
    }
    console.log('PASS GTM transport: real container generated GA4 tool_view/start/action/complete requests; ALL collection blocked from network');
    await transport.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
