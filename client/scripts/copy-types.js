import { mkdir, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const srcTypes = join(rootDir, 'src', 'types', 'index.d.ts');
const distTypesDir = join(rootDir, 'dist', 'types');
const distTypes = join(distTypesDir, 'index.d.ts');

try {
  await mkdir(distTypesDir, { recursive: true });
  await copyFile(srcTypes, distTypes);
  console.log('✓ Types copied to dist/types/index.d.ts');
} catch (error) {
  console.error('Error copying types:', error);
  process.exit(1);
}


