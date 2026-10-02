const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
global.crypto = require('node:crypto').webcrypto;
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { nicknameList, encryptNicknameGallery, decryptNicknameGallery } = require('../lib/gallery-names.ts');
const { encryptGallery, readPublishedGallery } = require('../lib/gallery-reader.ts');
const { openGithubNicknameAlbum, publishGithubNicknameAlbum } = require('../lib/gallery-github.ts');

(async () => {
  const names = ['moonbeam', 'little star', 'sunshine', 'peach', 'honeybee', 'sweetheart', 'darling'];
  const memories = [{ id: 'one', photo: 'data:image/jpeg;base64,cGhvdG8=', caption: 'Our memory', story: 'A story with feelings.' }];
  assert.deepEqual(nicknameList(' Moonbeam\nLITTLE   STAR,moonbeam;Peach '), ['moonbeam', 'little star', 'peach']);
  const payload = JSON.parse(await encryptNicknameGallery(memories, names));
  const published = JSON.stringify(payload);
  for (const value of [...names, memories[0].photo, memories[0].story]) assert.equal(published.includes(value), false);
  let subsets = 0;
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {
    const answers = names.filter((_, i) => i !== a && i !== b).reverse();
    const result = await decryptNicknameGallery(payload, answers);
    assert.deepEqual(result.memories, memories); assert.deepEqual(result.names, names); subsets++;
  }
  assert.equal(subsets, 21);
  assert.deepEqual((await decryptNicknameGallery(payload, [' Moonbeam ', 'LITTLE   STAR', 'SUNSHINE', 'peach', 'Honeybee'])).memories, memories);
  await assert.rejects(decryptNicknameGallery(payload, names.slice(0, 4)), /five different/);
  await assert.rejects(decryptNicknameGallery(payload, ['moonbeam', 'MOONBEAM', 'moonbeam', 'Moonbeam', 'moonbeam']), /five different/);
  await assert.rejects(decryptNicknameGallery(payload, [...names.slice(0, 4), 'wrong name']), /Not quite/);
  await assert.rejects(encryptNicknameGallery(memories, names.slice(0, 4)), /5 and 50/);
  await assert.rejects(decryptNicknameGallery({ ...payload, data: payload.data.slice(0, -4) + 'AAAA' }, names), /could not be opened/);
  await assert.rejects(decryptNicknameGallery({ ...payload, shares: [] }, names), /could not be read/);
  global.fetch = async () => new Response(JSON.stringify(payload));
  assert.deepEqual(await readPublishedGallery(names.slice(1, 6)), memories);
  let file = JSON.parse(await encryptGallery(memories, '4826'));
  global.fetch = async url => new Response(JSON.stringify(url.endsWith('/user') ? {login:'zaidh-mech'} : url.includes('/contents/') ? {sha:'old',encoding:'base64',content:btoa(JSON.stringify(file))} : {permissions:{push:true}}));
  const old = await openGithubNicknameAlbum('test-token', [], '4826');
  assert.deepEqual(old.memories, memories); assert.deepEqual(old.names, []);
  global.fetch = async (url, options) => {
    const body = JSON.parse(options.body); assert.equal(body.sha, 'old'); assert.equal(options.method, 'PUT');
    file = JSON.parse(atob(body.content)); assert.equal(file.version, 2);
    return new Response(JSON.stringify({content:{sha:'new'}}));
  };
  assert.equal(await publishGithubNicknameAlbum('test-token', names, 'old', old.memories), 'new');
  assert.deepEqual((await decryptNicknameGallery(file, names.slice(2))).memories, memories);
  global.fetch = async url => new Response(JSON.stringify(url.endsWith('/user') ? {login:'zaidh-mech'} : url.includes('/contents/') ? {sha:'new',encoding:'base64',content:btoa(JSON.stringify(file))} : {permissions:{push:true}}));
  assert.deepEqual((await openGithubNicknameAlbum('test-token', names.slice(2), '')).names, names);
  console.log('PASS: all 21 five-name subsets, normalization, duplicate/wrong-answer rejection, encrypted content, damaged payload rejection, viewer unlock and lossless PIN migration through GitHub publish.');
})().catch(error => { console.error(error); process.exitCode = 1; });
