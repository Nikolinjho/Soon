import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function () {
  try {
    const distPath = join(__dirname, 'dist');
    await fs.emptyDir(distPath);
    console.log('✅ dist folder cleaned ✅');
  } catch (error) {
    console.error('❌ dist folder cleaning failed ❌', error);
  }
}
