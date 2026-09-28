const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
const typescript = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 } }).outputText;
  module._compile(output, filename);
};
globalThis.crypto = webcrypto;

const { encryptGallery, decryptGallery } = require('../lib/gallery-reader.ts');
const { openGithubAlbum, publishGithubAlbum } = require('../lib/gallery-github.ts');

(async () => {
  const sample = [{ id: 'one', photo: 'data:image/png;base64,aGVsbG8=', caption: 'Our day', story: 'A very long story can live here.\nAnother paragraph.' }];
  const payload = await encryptGallery(sample, '4826');
  assert.deepEqual(await decryptGallery(JSON.parse(payload), '4826'), sample);
  await assert.rejects(() => decryptGallery(JSON.parse(payload), '0000'), /PIN/);

  let login = 'zaidh-mech';
  let canWrite = true;
  let conflict = false;
  let largeFile = false;
  let published;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    if (url.endsWith('/user')) return new Response(JSON.stringify({ login }), { status: 200 });
    if (url.endsWith('/repos/zaidh-mech/project-zeno')) return new Response(JSON.stringify({ permissions: { push: canWrite } }), { status: 200 });
    if (String(url).includes('/contents/web/public/gallery.enc.json') && options.method === 'PUT') {
      published = JSON.parse(options.body);
      return new Response(JSON.stringify({ content: { sha: 'next-version' } }), { status: conflict ? 409 : 200 });
    }
    if (String(url).includes('/contents/web/public/gallery.enc.json')) {
      if (options.headers.Accept === 'application/vnd.github.raw+json') return new Response(payload, { status: 200 });
      return new Response(JSON.stringify(largeFile ? { encoding: 'none', content: '', sha: 'first-version' } : { encoding: 'base64', content: btoa(payload), sha: 'first-version' }), { status: 200 });
    }
    throw new Error('Unexpected request: ' + url);
  };
  const album = await openGithubAlbum('test-token', '4826');
  assert.equal(album.sha, 'first-version');
  assert.deepEqual(album.memories, sample);
  largeFile = true;
  assert.deepEqual((await openGithubAlbum('test-token', '4826')).memories, sample, 'Large files use the raw GitHub response');
  largeFile = false;
  assert.equal(await publishGithubAlbum('test-token', '4826', album.sha, sample), 'next-version');
  assert.equal(published.sha, 'first-version');
  assert.equal(published.branch, 'main');
  assert.deepEqual(await decryptGallery(JSON.parse(atob(published.content)), '4826'), sample);
  login = 'someone-else';
  await assert.rejects(() => openGithubAlbum('test-token', '4826'), /repository owner/);
  login = 'zaidh-mech'; canWrite = false;
  await assert.rejects(() => openGithubAlbum('test-token', '4826'), /Contents read and write/);
  canWrite = true; conflict = true;
  await assert.rejects(() => publishGithubAlbum('test-token', '4826', album.sha, sample), /changed on GitHub/);
  console.log('PASS: album encryption, owner-only sign-in, write permission, versioned GitHub publish, and conflict handling.');
})().catch(error => { console.error(error); process.exitCode = 1; });
