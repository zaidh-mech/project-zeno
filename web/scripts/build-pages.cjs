const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadEnvConfig } = require('@next/env');

(async () => {
  const root = path.resolve(__dirname, '..');
  loadEnvConfig(root);
  const settings = JSON.parse(await fs.readFile(path.join(root, 'public', 'site-settings.json'), 'utf8'));
  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'project-zeno';
  const basePath = process.env.PAGES_BASE_PATH ?? (repository.endsWith('.github.io') ? '' : `/${repository}`);
  if (basePath && !/^\/[a-zA-Z0-9._-]+$/.test(basePath)) throw new Error('PAGES_BASE_PATH must be empty or a single /repository-name.');
  await fs.access(path.join(root, 'public', 'gallery.enc.json')).catch(() => { throw new Error('Export your album from http://localhost:3000/admin before building GitHub Pages.'); });
  const staging = await fs.mkdtemp(path.join(root, '.pages-build-'));
  try {
    for (const folder of ['app', 'components', 'lib', 'public']) {
      await fs.cp(path.join(root, folder), path.join(staging, folder), {
        recursive: true,
        filter: source => source !== path.join(root, 'app', 'api') && (settings.companionEnabled === true || source !== path.join(root, 'app', 'control')),
      });
    }
    for (const file of ['package.json', 'tsconfig.json', 'postcss.config.mjs', 'next-env.d.ts']) await fs.copyFile(path.join(root, file), path.join(staging, file));
    // Static builds must never typecheck or bundle server-only implementation files.
    for (const file of ['gallery-auth.ts', 'gallery-store.ts', 'gallery-export.ts']) await fs.unlink(path.join(staging, 'lib', file));
    const githubRepository = process.env.GITHUB_REPOSITORY || 'zaidh-mech/project-zeno';
    await fs.writeFile(path.join(staging, 'next.config.mjs'), `export default ${JSON.stringify({ output: 'export', trailingSlash: true, basePath, images: { unoptimized: true }, env: { NEXT_PUBLIC_GALLERY_STATIC: 'true', NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_GITHUB_REPOSITORY: githubRepository } })};\n`);
    const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build', staging], { cwd: root, stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_GALLERY_STATIC: 'true', NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_GITHUB_REPOSITORY: githubRepository } });
    if (result.status !== 0) throw new Error('GitHub Pages build failed.');
    const output = path.join(root, 'out');
    // This fixed output path is inside the web workspace; only generated files are replaced.
    if (path.dirname(output) !== root) throw new Error('Unsafe output path.');
    await fs.rm(output, { recursive: true, force: true });
    await fs.cp(path.join(staging, 'out'), output, { recursive: true });
    await fs.writeFile(path.join(output, '.nojekyll'), '');
    for (const name of ['api', '.env.local', '.gallery-data']) {
      const exists = await fs.access(path.join(output, name)).then(() => true, () => false);
      if (exists) throw new Error(`Private path found in static output: ${name}`);
    }
    await fs.access(path.join(output, 'admin', 'index.html'));
    console.log(`GitHub Pages viewer and admin site ready in web/out (base path: ${basePath || '/'}).`);
  } finally {
    if (path.dirname(staging) === root && path.basename(staging).startsWith('.pages-build-')) await fs.rm(staging, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
