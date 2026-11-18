import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
const meta = JSON.parse(await readFile('app.json', 'utf8'));
const executablePath = process.platform === 'darwin'
  ? path.resolve('release/mac-universal', meta.name + '.app', 'Contents/MacOS', meta.name)
  : path.resolve('release/win-unpacked', meta.name + '.exe');
const profile = await mkdtemp(path.join(tmpdir(), 'bc-packaged-'));
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({ executablePath, args: ['--user-data-dir=' + profile], env });
try {
  const page = await app.firstWindow();
  await expect(page.locator('main h1').first()).toBeVisible();
  const info = await app.evaluate(({ app, BrowserWindow }) => ({ packaged: app.isPackaged, version: app.getVersion(), sandbox: BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences().sandbox }));
  expect(info).toEqual({ packaged: true, version: meta.version, sandbox: true });
  expect(await page.evaluate(() => typeof window.require)).toBe('undefined');
  expect(await page.evaluate(async () => { try { await fetch('https://example.com'); return false; } catch { return true; } })).toBe(true);
  console.log('Packaged application smoke test passed:', meta.name, process.platform);
} finally { await app.close(); await rm(profile, { recursive: true, force: true }); }
