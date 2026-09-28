const { spawn } = require('node:child_process');
const { randomBytes, webcrypto } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const root = path.resolve(__dirname, '..');
  const directory = await fs.mkdtemp(path.join(root, '.gallery-test-'));
  const exportPath = path.join(directory, 'gallery.enc.json');
  const base = 'http://localhost:3198';
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '-p', '3198'], {
    cwd: root,
    env: { ...process.env, AURA_GALLERY_PIN: '4826', AURA_GALLERY_ADMIN_PASSWORD: 'test-admin-password', AURA_GALLERY_SESSION_SECRET: randomBytes(32).toString('hex'), AURA_GALLERY_DATA_DIR: directory, AURA_GALLERY_EXPORT_PATH: exportPath },
    stdio: 'ignore',
  });
  const request = (url, method = 'GET', cookie = '', body, origin = base) => fetch(`${base}${url}`, {
    method, headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
  });
  async function login(body) {
    const response = await request('/api/gallery/unlock', 'POST', '', body);
    assert.equal(response.status, 200, await response.text());
    return response.headers.get('set-cookie').split(';')[0];
  }
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'Production server starts');
    assert.equal((await request('/api/gallery')).status, 401);
    assert.equal((await request('/api/gallery/photo/missing')).status, 401);
    assert.equal((await request('/api/gallery/unlock', 'POST', '', { pin: '0000' })).status, 401);
    const viewer = await login({ pin: '4826' });
    const admin = await login({ role: 'admin', password: 'test-admin-password' });
    assert.equal((await request('/api/gallery', 'POST', viewer)).status, 403);
    assert.equal((await request('/api/gallery', 'POST', admin, undefined, 'https://untrusted.example')).status, 403);
    const created = await request('/api/gallery', 'POST', admin);
    assert.equal(created.status, 201);
    const { memory } = await created.json();
    const memoryUrl = `/api/gallery/memory/${memory.id}`, photoUrl = `/api/gallery/photo/${memory.id}`;
    for (const [url, method] of [[memoryUrl, 'PATCH'], [memoryUrl, 'DELETE'], [photoUrl, 'POST'], [photoUrl, 'DELETE'], ['/api/gallery/export', 'POST']]) assert.equal((await request(url, method, viewer, { caption: 'forbidden', story: '' })).status, 403);
    const forged = admin.slice(0, -1) + (admin.endsWith('a') ? 'b' : 'a');
    assert.equal((await request('/api/gallery', 'POST', forged)).status, 403);
    assert.equal((await request(memoryUrl, 'PATCH', admin, { caption: 'Our first photo', story: 'A story to remember.' })).status, 200);
    assert.equal((await request(memoryUrl, 'PATCH', admin, { caption: 'x'.repeat(141), story: '' })).status, 400);
    assert.equal((await (await request('/api/gallery', 'GET', viewer)).json()).memories.length, 0, 'Empty drafts are hidden from viewers');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8e8AAAAASUVORK5CYII=', 'base64');
    function photoForm(bytes = png, type = 'image/png') { const data = new FormData(); data.append('photo', new Blob([bytes], { type }), 'test.png'); return data; }
    assert.equal((await request(photoUrl, 'POST', admin, photoForm(Buffer.from('<svg/>'), 'image/svg+xml'))).status, 400);
    assert.equal((await request(photoUrl, 'POST', admin, photoForm())).status, 200);
    const anotherPhone = await login({ pin: '4826' });
    const album = await (await request('/api/gallery', 'GET', anotherPhone)).json();
    assert.equal(album.memories.length, 1);
    assert.equal(album.memories[0].caption, 'Our first photo');
    assert.deepEqual(Buffer.from(await (await request(photoUrl, 'GET', anotherPhone)).arrayBuffer()), png);
    assert.equal((await request('/api/gallery/export', 'POST', admin)).status, 200);
    const encrypted = JSON.parse(await fs.readFile(exportPath, 'utf8'));
    assert.ok(!JSON.stringify(encrypted).includes('Our first photo'));
    async function decrypt(pin) {
      const material = await webcrypto.subtle.importKey('raw', Buffer.from(pin), 'PBKDF2', false, ['deriveKey']);
      const key = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt: Buffer.from(encrypted.salt, 'base64'), iterations: encrypted.iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      return JSON.parse(Buffer.from(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(encrypted.iv, 'base64') }, key, Buffer.from(encrypted.data, 'base64'))).toString());
    }
    assert.equal((await decrypt('4826'))[0].story, 'A story to remember.');
    await assert.rejects(() => decrypt('0000'));
    assert.equal((await request(photoUrl, 'DELETE', admin)).status, 200);
    assert.equal((await request(photoUrl, 'GET', viewer)).status, 404);
    assert.equal((await (await request('/api/gallery', 'GET', admin)).json()).memories[0].story, 'A story to remember.');
    assert.equal((await request(memoryUrl, 'DELETE', admin)).status, 200);
    assert.equal((await (await request('/api/gallery', 'GET', admin)).json()).memories.length, 0);
    assert.equal((await request('/api/gallery/unlock', 'DELETE', admin)).status, 200);
    for (let i = 0; i < 4; i++) assert.equal((await request('/api/gallery/unlock', 'POST', '', { pin: '0000' })).status, 401);
    assert.equal((await request('/api/gallery/unlock', 'POST', '', { pin: '4826' })).status, 429);
    console.log('PASS: admin CRUD, protected media, viewer write denial, tampered sessions, origin checks, cross-device reading, encrypted export/decryption, and retry limits.');
  } finally {
    server.kill();
    await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
    if (path.dirname(directory) === root && path.basename(directory).startsWith('.gallery-test-')) await fs.rm(directory, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
