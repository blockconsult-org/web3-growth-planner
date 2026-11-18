import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
function walk(root) { return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(root, entry.name)) : entry.name.endsWith('.test.mjs') ? [join(root, entry.name)] : []); }
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...walk('tests')], { stdio: 'inherit' });
process.exit(result.status ?? 1);
