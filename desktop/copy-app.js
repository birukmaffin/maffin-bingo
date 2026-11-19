// Copies the web app (parent folder) into ./app so Electron can package it.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..'), dst = path.join(__dirname, 'app');
fs.rmSync(dst, { recursive: true, force: true }); fs.mkdirSync(dst, { recursive: true });
for (const f of ['index.html', 'manifest.webmanifest']) fs.copyFileSync(path.join(src, f), path.join(dst, f));
for (const d of ['css', 'js', 'icons']) fs.cpSync(path.join(src, d), path.join(dst, d), { recursive: true });
console.log('app copied to', dst);
