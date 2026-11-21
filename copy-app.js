// Copies the web app (parent folder) into ./app so Electron can package it.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const src = path.join(__dirname, '..'), dst = path.join(__dirname, 'app');
fs.rmSync(dst, { recursive: true, force: true }); fs.mkdirSync(dst, { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest']) fs.copyFileSync(path.join(src, f), path.join(dst, f));
for (const d of ['css', 'js', 'icons', 'fonts']) fs.cpSync(path.join(src, d), path.join(dst, d), { recursive: true });
cp.spawnSync(process.execPath, [path.join(src, 'tools', 'copy-am-fonts.js'), path.join(__dirname, 'node_modules'), path.join(dst, 'fonts')], { stdio: 'inherit' });
console.log('app copied to', dst);
