const fs = require('node:fs');
const path = require('node:path');
global.crypto = require('node:crypto').webcrypto;

// Set up typescript loader from desktop node_modules if needed
const localTs = path.join(__dirname, '..', 'node_modules', 'typescript');
const desktopTs = 'C:/Users/User/Desktop/project-zeno/web/node_modules/typescript';
const tsPath = fs.existsSync(localTs) ? localTs : desktopTs;
const ts = require(tsPath);

require.extensions['.ts'] = (module, file) => module._compile(
  ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText,
  file
);

const { nicknameList, encryptNicknameGallery } = require('../lib/gallery-names.ts');

(async () => {
  const root = path.resolve(__dirname, '..');
  const memoriesFile = path.join(root, '.gallery-data', 'memories_base64.json');
  const encFile = path.join(root, 'public', 'gallery.enc.json');
  const desktopEncFile = 'C:/Users/User/Desktop/project-zeno/web/public/gallery.enc.json';

  if (!fs.existsSync(memoriesFile)) {
    console.error(`Error: ${memoriesFile} not found. Run "python tools/import_photos.py" first.`);
    process.exit(1);
  }

  const memories = JSON.parse(fs.readFileSync(memoriesFile, 'utf8'));
  console.log(`Loaded ${memories.length} memories.`);

  // Collect names from CLI args, env var, or assets/photos/nicknames.txt
  let rawNames = process.argv.slice(2).join(' ');
  if (!rawNames && process.env.AURA_NICKNAMES) {
    rawNames = process.env.AURA_NICKNAMES;
  }
  const nicknamesFile = path.resolve(root, '..', 'assets', 'photos', 'nicknames.txt');
  if (!rawNames && fs.existsSync(nicknamesFile)) {
    rawNames = fs.readFileSync(nicknamesFile, 'utf8');
  }

  const names = nicknameList(rawNames);
  if (names.length < 5) {
    console.log(`\nNote: Need at least 5 different cute names to encrypt the gallery.`);
    console.log(`Provide them by:\n  1. Creating assets/photos/nicknames.txt (one name per line)\n  2. Or running: node scripts/import-photos.cjs "name1" "name2" "name3" "name4" "name5"\n`);
    process.exit(2);
  }

  console.log(`Encrypting ${memories.length} photos with ${names.length} nicknames...`);
  const payload = await encryptNicknameGallery(memories, names);
  fs.writeFileSync(encFile, payload, 'utf8');
  console.log(`Wrote encrypted album to ${encFile} (${(Buffer.byteLength(payload) / (1024 * 1024)).toFixed(2)} MB)`);

  if (fs.existsSync(path.dirname(desktopEncFile))) {
    fs.writeFileSync(desktopEncFile, payload, 'utf8');
    console.log(`Also updated ${desktopEncFile}`);
  }

  console.log('Done! All photos added and encrypted for the website.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
