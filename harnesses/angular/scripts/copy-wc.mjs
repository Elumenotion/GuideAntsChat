import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// move up three levels to reach minimal/ then into client/dist
const source = resolve(__dirname, '../../../client/dist/guideants-chat.iife.js');
const target = resolve(__dirname, '../src/assets/guideants-chat.iife.js');

try {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  console.log('Copied web component to assets:', target);
} catch (err) {
  console.warn('Failed to copy web component. Build client first:', err?.message || err);
  process.exitCode = 0;
}


