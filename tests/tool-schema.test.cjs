const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const toolHeadPath = path.join(rootDir, '_includes/tool-head.html');
const toolsDataPath = path.join(rootDir, '_data/tools.yml');
const toolsDir = path.join(rootDir, 'tools');

test('tool-head.html contains valid JSON-LD template with WebApplication and BreadcrumbList', () => {
  const content = fs.readFileSync(toolHeadPath, 'utf8');
  assert.ok(content.includes('<script type="application/ld+json">'), 'Must contain ld+json script tag');
  assert.ok(content.includes('"@context": "https://schema.org"'), 'Must have Schema.org context');
  assert.ok(content.includes('"@type": "WebApplication"'), 'Must declare WebApplication');
  assert.ok(content.includes('"@type": "BreadcrumbList"'), 'Must declare BreadcrumbList');
  assert.ok(content.includes('page.application_category'), 'Must support front matter application_category');
  assert.ok(content.includes('tool_data.application_category'), 'Must support _data/tools.yml application_category');
  assert.ok(content.includes('default: "WebApplication"'), 'Must provide WebApplication fallback for new tools');
  assert.ok(content.includes('page.feature_list'), 'Must support front matter feature_list');
  assert.ok(content.includes('default: page.description'), 'Must provide description fallback for featureList');
  assert.ok(content.includes('"isAccessibleForFree": true'), 'Must declare free accessibility');
  assert.ok(content.includes('"browserRequirements": "Requires JavaScript. Requires HTML5."'), 'Must declare browser requirements');
  assert.ok(content.includes('"permissions":'), 'Must declare privacy / permission note');
  assert.ok(content.includes('"name": "首页"'), 'Must have 首页 breadcrumb');
  assert.ok(content.includes('"name": "工具"'), 'Must have 工具 breadcrumb');
});

test('_data/tools.yml defines application_category and feature_list for all registered tools', () => {
  const content = fs.readFileSync(toolsDataPath, 'utf8');
  const validCategories = new Set([
    'FinanceApplication',
    'DesignApplication',
    'GameApplication',
    'UtilitiesApplication',
    'WebApplication',
    'BusinessApplication'
  ]);

  const toolBlocks = content.split(/\n(?=[a-z0-9-_]+:\s*\n)/);
  assert.ok(toolBlocks.length >= 3, 'Must have at least 3 tools in _data/tools.yml');

  for (const block of toolBlocks) {
    const idMatch = block.match(/^([a-z0-9-_]+):/);
    if (!idMatch) continue;
    const toolId = idMatch[1];

    const categoryMatch = block.match(/application_category:\s*"([^"]+)"/);
    assert.ok(categoryMatch, `Tool ${toolId} must define application_category`);
    const category = categoryMatch[1];
    assert.ok(validCategories.has(category), `Tool ${toolId} category "${category}" must be valid Schema.org category`);

    const featureMatch = block.match(/feature_list:\s*"([^"]+)"/);
    assert.ok(featureMatch, `Tool ${toolId} must define feature_list`);
    assert.ok(featureMatch[1].length > 10, `Tool ${toolId} feature_list must have descriptive content`);
  }
});

test('all subdirectories under tools/ contain index.html that includes tool-head.html', () => {
  const entries = fs.readdirSync(toolsDir, { withFileTypes: true });
  const toolFolders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  assert.ok(toolFolders.length >= 3, 'Expected at least 3 tool directories');

  for (const folder of toolFolders) {
    const indexPath = path.join(toolsDir, folder, 'index.html');
    assert.ok(fs.existsSync(indexPath), `Tool directory ${folder} must have index.html`);
    const html = fs.readFileSync(indexPath, 'utf8');

    assert.ok(html.includes('{% include tool-head.html %}'), `${folder}/index.html must include tool-head.html`);
    assert.ok(html.includes(`tool_id: ${folder}`) || html.includes(`tool_id: "${folder}"`), `${folder}/index.html front matter must declare tool_id`);
    assert.ok(html.includes('title:'), `${folder}/index.html must declare title in front matter`);
    assert.ok(html.includes('description:'), `${folder}/index.html must declare description in front matter`);
  }
});
