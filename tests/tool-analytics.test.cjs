const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/tool-analytics.js'), 'utf8');

function boot(toolId = 'preflop-range', production = true, dataLayer) {
  const window = { location: { origin: 'https://shiliang.me', pathname: '/tools/' + toolId + '/', search: '?email=private', hash: '#secret' } };
  if (dataLayer) window.dataLayer = dataLayer;
  vm.runInNewContext(source, {
    window,
    document: { currentScript: { getAttribute: key => ({ 'data-tool-id': toolId, 'data-measurement-id': production ? 'G-MQH963M94G' : null })[key] } }
  });
  return window;
}
const events = w => Array.from(w.dataLayer || [], command => JSON.parse(JSON.stringify(Array.from(command))));

test('all tools emit one view, one start, deduplicated actions and repeatable completions', () => {
  for (const [id, edit, complete] of [
    ['preflop-range', 'select_position', 'copy_range'],
    ['investment-checklist', 'edit', 'save'],
    ['wechat-formatter', 'edit', 'copy_rich']
  ]) {
    const w = boot(id);
    w.toolAnalytics.action(edit);
    w.toolAnalytics.action(edit);
    w.toolAnalytics.complete(complete);
    w.toolAnalytics.complete(complete);
    assert.deepEqual(events(w).map(e => e[1]), ['tool_view', 'tool_start', 'tool_action', 'tool_action', 'tool_complete', 'tool_complete']);
    for (const [command, , params] of events(w)) {
      assert.equal(command, 'event');
      assert.equal(params.tool_id, id);
      assert.equal(params.send_to, 'G-MQH963M94G');
      assert.equal(params.page_location, 'https://shiliang.me/tools/' + id + '/');
      assert.equal(params.page_referrer, '');
      assert.ok(Object.keys(params).every(key => ['send_to', 'tool_id', 'action', 'page_location', 'page_referrer'].includes(key)));
    }
  }
});

test('failed copy attempt has no completion; completion-only visit has a start', () => {
  const w = boot();
  w.toolAnalytics.action('copy_range');
  assert.equal(events(w).filter(e => e[1] === 'tool_complete').length, 0);
  const direct = boot();
  direct.toolAnalytics.complete('copy_range');
  assert.deepEqual(events(direct).map(e => e[1]), ['tool_view', 'tool_start', 'tool_action', 'tool_complete']);
});

test('rejects unknown tools/actions and never treats print/edit as completion', () => {
  const w = boot('investment-checklist');
  w.toolAnalytics.action('private input');
  w.toolAnalytics.complete('print');
  w.toolAnalytics.complete('edit');
  assert.equal(events(w).length, 1);
  const unknown = boot('unknown');
  unknown.toolAnalytics.action('edit');
  assert.equal(events(unknown).length, 0);
});

test('development is silent, existing queue is preserved, analytics failures are isolated', () => {
  const dev = boot('preflop-range', false);
  dev.toolAnalytics.complete('copy_range');
  assert.equal(events(dev).length, 0);
  const queue = [{ event: 'gtm.js' }];
  const w = boot('preflop-range', true, queue);
  assert.equal(w.dataLayer, queue);
  assert.equal(queue[0].event, 'gtm.js');
  const broken = boot('preflop-range', true, { push() { throw new Error('blocked'); } });
  assert.doesNotThrow(() => broken.toolAnalytics.complete('copy_range'));
});
