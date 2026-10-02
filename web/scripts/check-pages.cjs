const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { loadEnvConfig } = require('@next/env');

(async () => {
  const root = path.resolve(__dirname, '..');
  loadEnvConfig(root);
  const output = path.join(root, 'out');
  for (const name of ['api', '.env.local', '.gallery-data']) assert.equal(await fs.access(path.join(output, name)).then(() => true, () => false), false, `No ${name} in public output`);
  assert.ok((await fs.readFile(path.join(output, 'admin', 'index.html'), 'utf8')).includes('Your private album studio.'), 'Online admin sign-in is published');
  const secrets = [process.env.AURA_GALLERY_ADMIN_PASSWORD, process.env.AURA_GALLERY_SESSION_SECRET].filter(Boolean);
  async function scan(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await scan(filename);
      else {
        const data = await fs.readFile(filename);
        for (const secret of secrets) assert.equal(data.includes(Buffer.from(secret)), false, 'No admin credentials in static output');
      }
    }
  }
  await scan(output);
  const html = await fs.readFile(path.join(output, 'index.html'), 'utf8');
  assert.ok(html.includes('A little collection of us.'));
  const payload = JSON.parse(await fs.readFile(path.join(output, 'gallery.enc.json'), 'utf8'));
  assert.ok(payload.version === 1 || payload.version === 2);
  if (payload.version === 2) assert.ok(payload.shares.length >= 5);
  assert.ok(html.includes('What are five cute names I love to call you?'));
  assert.equal(payload.iterations, 250000);
  console.log('PASS: static album and admin sign-in render, with no API routes, raw storage, or admin credentials published.');
})().catch(error => { console.error(error); process.exitCode = 1; });
