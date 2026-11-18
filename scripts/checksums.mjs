import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const folder = process.argv[2] || 'release';
const files = (await readdir(folder)).filter(file => /\.(exe|dmg|zip)$/.test(file)).sort();
if (!files.length) throw new Error('No release artifacts found');
const lines = await Promise.all(files.map(async file => createHash('sha256').update(await readFile(path.join(folder, file))).digest('hex') + '  ' + file));
await writeFile(path.join(folder, 'SHA256SUMS.txt'), lines.join('\n') + '\n');
