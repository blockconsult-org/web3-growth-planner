const { app, BrowserWindow, protocol, session, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { CSP, localUrl, externalUrl, assetPath } = require('./security.cjs');
const meta = require('../app.json');

protocol.registerSchemesAsPrivileged([{ scheme: 'bcapp', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
if (process.env.BC_TEST_USER_DATA && !app.isPackaged) app.setPath('userData', process.env.BC_TEST_USER_DATA);
app.setName(meta.name);
app.setAppUserModelId(meta.appId);
let pdfBusy = false;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

async function savePdf(win) {
  if (!win || pdfBusy || !localUrl(win.webContents.getURL())) return false;
  pdfBusy = true;
  const background = win.getBackgroundColor();
  try {
    const selection = await dialog.showSaveDialog(win, { title: 'Save report / Bericht speichern', defaultPath: meta.slug + '-report.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (selection.canceled || !selection.filePath) return false;
    // Chromium paints PDF page margins using the native view background.
    win.setBackgroundColor('#ffffff');
    await win.webContents.executeJavaScript("window.dispatchEvent(new Event('beforeprint'))");
    const data = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
    await fs.writeFile(selection.filePath, data);
    return true;
  } catch (error) {
    await dialog.showMessageBox(win, { type: 'error', message: 'The PDF could not be saved. / Das PDF konnte nicht gespeichert werden.', detail: String(error.message) });
    return false;
  } finally {
    if (!win.isDestroyed()) win.setBackgroundColor(background);
    if (!win.isDestroyed()) await win.webContents.executeJavaScript("window.dispatchEvent(new Event('afterprint'))").catch(() => {});
    pdfBusy = false;
  }
}

async function openExternal(win, url) {
  if (!externalUrl(url)) return;
  const u = new URL(url);
  // Company and repository links are authored application UI. Evidence links
  // come from imported models and require an explicit destination preview.
  if (!['www.blockconsult.org', 'blockconsult.org', 'github.com'].includes(u.hostname)) {
    const result = await dialog.showMessageBox(win, { type: 'question', buttons: ['Cancel / Abbrechen', 'Open browser / Browser öffnen'], defaultId: 0, cancelId: 0, message: 'Open this website? / Diese Website öffnen?', detail: u.href });
    if (result.response !== 1) return;
  }
  await shell.openExternal(u.href);
}

function createWindow() {
  const win = new BrowserWindow({ width: 1440, height: 960, minWidth: 800, minHeight: 600, show: false, title: meta.name, backgroundColor: '#08090a', icon: path.join(__dirname, '../build/icon.png'), webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, webviewTag: false } });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { void openExternal(win, url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (event, url) => { if (!localUrl(url)) { event.preventDefault(); void openExternal(win, url); } });
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.webContents.on('render-process-gone', () => { dialog.showMessageBox(win, { type: 'error', message: 'The workspace stopped unexpectedly. Reopen the app to restore a saved draft.' }); });
  win.loadURL('bcapp://app' + meta.publicPath);
  return win;
}

app.whenReady().then(() => {
  const root = path.join(app.getAppPath(), 'dist');
  protocol.handle('bcapp', async request => {
    const file = assetPath(request.url, root, meta.publicPath);
    if (!file || request.method !== 'GET') return new Response('Not found', { status: 404 });
    try { return new Response(await fs.readFile(file), { headers: { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff' } }); }
    catch { return new Response('Not found', { status: 404 }); }
  });
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => callback(permission === 'clipboard-sanitized-write'));
  session.defaultSession.setPermissionCheckHandler((_contents, permission, origin) => localUrl(origin) && permission === 'clipboard-sanitized-write');
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !localUrl(details.url) && !details.url.startsWith('blob:bcapp://app/') && !details.url.startsWith('data:') }));
  session.defaultSession.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ title: 'Save export / Export speichern', defaultPath: path.basename(item.getFilename()) });
  });
  ipcMain.handle('report:pdf', event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || event.senderFrame !== event.sender.mainFrame || !localUrl(event.senderFrame.url)) return false;
    return savePdf(win);
  });
  app.setAboutPanelOptions({ applicationName: meta.name, applicationVersion: app.getVersion(), copyright: '© 2026 Block Consult GmbH · MIT license', website: meta.repository });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { label: 'File', submenu: [{ label: 'Save report as PDF…', accelerator: 'CmdOrCtrl+P', click: (_item, win) => savePdf(win) }, { type: 'separator' }, { role: process.platform === 'darwin' ? 'close' : 'quit' }] },
    { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: 'Documentation & downloads', click: () => shell.openExternal(meta.repository) }, { label: 'Block Consult', click: () => shell.openExternal('https://www.blockconsult.org') }, ...(process.platform !== 'darwin' ? [{ role: 'about' }] : [])] },
  ]));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
