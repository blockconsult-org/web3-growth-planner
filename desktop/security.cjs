const path = require('node:path');

const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'";
function localUrl(value) {
  try { const u = new URL(value); return u.protocol === 'bcapp:' && u.hostname === 'app' && !u.username && !u.password && !u.port; } catch { return false; }
}
function externalUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; }
}
function assetPath(value, root, publicPath) {
  if (!localUrl(value)) return null;
  let pathname;
  try { pathname = decodeURIComponent(new URL(value).pathname); } catch { return null; }
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').includes('..')) return null;
  const routes = ['/', '/de', '/de/', publicPath, publicPath + '/', '/de' + publicPath, '/de' + publicPath + '/'];
  if (routes.includes(pathname)) return path.join(root, 'index.html');
  if (!/^\/(assets\/[^/]+|icon\.png|blockconsult-logo(?:-light)?\.png)$/.test(pathname)) return null;
  const target = path.resolve(root, '.' + pathname);
  return target.startsWith(root + path.sep) ? target : null;
}
module.exports = { CSP, localUrl, externalUrl, assetPath };
