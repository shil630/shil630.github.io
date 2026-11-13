const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');

test('_includes/head.html supports page.robots and paginated noindex', () => {
  const head = fs.readFileSync(path.join(rootDir, '_includes/head.html'), 'utf8');
  assert.ok(head.includes('page.robots'), 'head.html must render page.robots when set');
  assert.ok(head.includes('paginator.page > 1'), 'head.html must handle pagination page > 1');
  assert.ok(head.includes('noindex, follow'), 'head.html must output noindex, follow on paginated pages');
  assert.ok(head.includes("{% include seo-schema.html %}"), 'head.html must include seo-schema.html');
});

test('_layouts/post.html supports key_points, last_modified_at, lazy/async prose images and author card', () => {
  const postLayout = fs.readFileSync(path.join(rootDir, '_layouts/post.html'), 'utf8');
  assert.ok(postLayout.includes('page.key_points.size > 0'), 'post layout must support optional key_points');
  assert.ok(postLayout.includes('page.last_modified_at'), 'post layout must support last_modified_at');
  assert.ok(postLayout.includes("loading=\"lazy\" decoding=\"async\""), 'post layout must inject lazy/async attributes on prose images');
  assert.ok(postLayout.includes('class="post-author-card"'), 'post layout must include author attribution card');
  assert.ok(postLayout.includes('class="post-related-posts"'), 'post layout must include related reading links');
});

test('llms.txt and llms-full.txt dynamically read tools, exclude drafts and expose key_points', () => {
  const llms = fs.readFileSync(path.join(rootDir, 'llms.txt'), 'utf8');
  const llmsFull = fs.readFileSync(path.join(rootDir, 'llms-full.txt'), 'utf8');
  assert.ok(llms.includes('site.data.tools'), 'llms.txt must iterate site.data.tools');
  assert.ok(llms.includes('post.draft != true'), 'llms.txt must exclude drafts');
  assert.ok(llms.includes('/llms-full.txt'), 'llms.txt must link to /llms-full.txt');
  assert.ok(llmsFull.includes('site.data.tools'), 'llms-full.txt must iterate site.data.tools');
  assert.ok(llmsFull.includes('post.draft != true'), 'llms-full.txt must exclude drafts');
  assert.ok(llmsFull.includes('post.key_points.size > 0'), 'llms-full.txt must support key_points');
});

test('_includes/seo-schema.html defines ProfilePage/Person, BreadcrumbList and CollectionPage schemas', () => {
  const schema = fs.readFileSync(path.join(rootDir, '_includes/seo-schema.html'), 'utf8');
  assert.ok(schema.includes('"@type": "ProfilePage"'), 'Must include ProfilePage schema');
  assert.ok(schema.includes('"@type": "Person"'), 'Must include Person schema');
  assert.ok(schema.includes('"@type": "BreadcrumbList"'), 'Must include BreadcrumbList schema');
  assert.ok(schema.includes('"@type": "CollectionPage"'), 'Must include CollectionPage schema for /tools/');
});
