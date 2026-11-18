import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import meta from '../../app.json' with { type: 'json' };
import { shareHash } from './fixture';

const menus: Record<string, string> = { 'ai-roi': 'Files & actions', 'ai-opportunity-finder': 'Scenario actions', 'ai-workflow-blueprint': 'Export', 'web3-due-diligence': 'Files & local data', 'dao-governance': 'Files & saved data', 'web3-growth-planner': 'Files & storage', 'tokenomics-simulator': 'Export and import' };
const jsonLabels: Record<string, string> = { 'web3-due-diligence': 'Export full model JSON', 'tokenomics-simulator': 'Download model (JSON)' };

test('native JSON round trip and browser-compatible offline snapshots', async () => {
  const profile = await mkdtemp(path.join(tmpdir(), 'bc-data-test-'));
  const env = { ...process.env, BC_TEST_USER_DATA: profile }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: ['.'], env });
  try {
    const page = await app.firstWindow();
    await expect(page.locator('main h1').first()).toBeVisible();
    async function exportJson(filename: string) {
      const output = path.join(profile, filename);
      await app.evaluate(({ session }, output) => { session.defaultSession.once('will-download', (_event, item) => item.setSavePath(output)); }, output);
      const action = page.getByText(jsonLabels[meta.slug] || 'Export JSON', { exact: true });
      if (!await action.isVisible()) await page.getByRole('button', { name: menus[meta.slug], exact: true }).first().click();
      await action.click();
      await expect.poll(async () => { try { return (await stat(output)).size; } catch { return 0; } }).toBeGreaterThan(10);
      return JSON.parse(await readFile(output, 'utf8'));
    }
    const original = await exportJson('model.json');
    const modified = structuredClone(original);
    if ('title' in modified) modified.title = 'Desktop round-trip test';
    else if ('projectName' in modified) modified.projectName = 'Desktop round-trip test';
    else if ('name' in modified) modified.name = 'Desktop round-trip test';
    else if ('inputs' in modified) modified.inputs.objective = 'Desktop round-trip test';
    else if ('token' in modified) modified.token.name = 'Desktop round-trip test';
    const dialogs = page.locator('dialog[open]');
    if (await dialogs.count()) await page.keyboard.press('Escape');
    const fileInput = page.locator('input[type="file"]');
    // The blueprint's import input is mounted inside its Files dialog.
    if (meta.slug === 'ai-workflow-blueprint') await page.getByRole('button', { name: 'Files & reset', exact: true }).click();
    await fileInput.first().setInputFiles({ name: 'round-trip.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(modified)) });
    if (meta.slug === 'ai-workflow-blueprint') await page.getByRole('button', { name: 'Replace blueprint', exact: true }).click();
    if (meta.slug !== 'ai-workflow-blueprint') await expect.poll(async () => {
      // Parsing is asynchronous; each tool clears its input after consuming it.
      return await fileInput.first().evaluate((input: HTMLInputElement) => input.value).catch(() => '');
    }).toBe('');
    if (await dialogs.count()) await page.keyboard.press('Escape');
    const restored = await exportJson('restored.json');
    expect(restored).toEqual(modified);
    if (await dialogs.count()) await page.keyboard.press('Escape');
    const csv = meta.slug === 'tokenomics-simulator';
    const imageOutput = path.join(profile, csv ? 'monthly.csv' : 'summary.png');
    await app.evaluate(({ session }, output) => { session.defaultSession.once('will-download', (_event, item) => item.setSavePath(output)); }, imageOutput);
    if (meta.slug === 'ai-opportunity-finder') await page.getByRole('tab', { name: /Compare/ }).click();
    const imageAction = page.getByText(csv ? 'Download monthly data (CSV)' : 'Download PNG summary', { exact: true });
    if (!await imageAction.isVisible()) await page.getByRole('button', { name: menus[meta.slug], exact: true }).first().click();
    await imageAction.click();
    await expect.poll(async () => { try { return (await stat(imageOutput)).size; } catch { return 0; } }).toBeGreaterThan(100);
    const imageData = await readFile(imageOutput);
    if (csv) expect(imageData.toString()).toContain('\r\n');
    else expect([...imageData.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    if (await dialogs.count()) await page.keyboard.press('Escape');
    const hash = await shareHash(restored);
    await page.getByRole('button', { name: 'Open share link', exact: true }).click();
    await page.locator('#snapshot').fill('https://www.blockconsult.org' + meta.publicPath + hash);
    await page.getByRole('button', { name: 'Open scenario', exact: true }).click();
    await expect(page).toHaveURL('bcapp://app' + meta.publicPath + hash);
    if (meta.slug !== 'tokenomics-simulator') await expect(page.getByRole('button', { name: 'Make a copy', exact: true })).toBeVisible();
    else await expect(page.getByText('Loaded the model from the link. Your own model is still saved, and Undo brings it back.', { exact: true })).toBeVisible();
  } finally { await app.close(); await rm(profile, { recursive: true, force: true }); }
});
