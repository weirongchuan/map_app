import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, '..');
const distDir = join(projectRoot, 'dist');
const sourceStaticDir = join(projectRoot, 'static');
const distStaticDir = join(distDir, 'static');

await rm(distDir, { recursive: true, force: true });
await mkdir(distStaticDir, { recursive: true });

await copyFile(join(projectRoot, 'index.html'), join(distDir, 'index.html'));
await cp(join(projectRoot, 'css'), join(distDir, 'css'), { recursive: true });
await cp(join(projectRoot, 'js'), join(distDir, 'js'), { recursive: true });

for (const filename of ['earth.jpg', 'world.zh.json', 'china.json']) {
    await copyFile(join(sourceStaticDir, filename), join(distStaticDir, filename));
}

const cityDataset = process.env.CITY_DATASET ?? 'icosahedron.json';
await copyFile(join(sourceStaticDir, cityDataset), join(distStaticDir, 'citys.json'));

console.log(`Build completed: ${distDir}`);
