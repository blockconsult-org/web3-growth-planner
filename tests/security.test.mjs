import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
const { assetPath, externalUrl, localUrl } = createRequire(import.meta.url)('../desktop/security.cjs');
const root = path.resolve('dist');
test('local protocol rejects other hosts, credentials, paths and encoded traversal', () => {
  assert.equal(assetPath('bcapp://app/tools/ai-roi', root, '/tools/ai-roi'), path.join(root, 'index.html'));
  assert.equal(assetPath('bcapp://app/assets/app.js', root, '/tools/ai-roi'), path.join(root, 'assets/app.js'));
  for (const url of ['file:///etc/passwd', 'https://app/assets/app.js', 'bcapp://evil/assets/a.js', 'bcapp://user@app/assets/a.js', 'bcapp://app:123/assets/a.js', 'bcapp://app/%2e%2e%2fpackage.json', 'bcapp://app/assets/%2e%2e%5csecret', 'bcapp://app/assets/%00', 'bcapp://app/package.json', 'bcapp://app/tools/other']) assert.equal(assetPath(url, root, '/tools/ai-roi'), null, url);
});
test('external navigation allows HTTPS only without embedded credentials', () => {
  assert.equal(externalUrl('https://example.com/evidence?q=1#section'), true);
  for (const url of ['javascript:alert(1)', 'file:///tmp/a', 'data:text/html,x', 'http://example.com', 'https://user:password@example.com', 'ms-settings:display', 'not a url']) assert.equal(externalUrl(url), false);
  assert.equal(localUrl('bcapp://app/tools/ai-roi'), true);
  assert.equal(localUrl('bcapp://app.evil/tools/ai-roi'), false);
});
