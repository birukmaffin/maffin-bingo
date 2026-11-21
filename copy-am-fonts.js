// Copies the Amharic font (Noto Sans Ethiopic, OFL licence) from the npm package @fontsource into the app.
// Usage: node copy-am-fonts.js <node_modules dir> <destination fonts dir>
// If the font cannot be found the app simply falls back to the phone's own Amharic font.
const fs = require('fs'), path = require('path');
const [, , nm, dest] = process.argv;
const dir = path.join(nm, '@fontsource', 'noto-sans-ethiopic', 'files');
fs.mkdirSync(dest, { recursive: true });
if (!fs.existsSync(dir)) { console.log('Amharic font package not found - using system fonts'); process.exit(0); }
let n = 0;
for (const w of [400, 700, 900]) {
  const f = fs.readdirSync(dir).find(x => x.endsWith(`ethiopic-${w}-normal.woff2`));
  if (f) { fs.copyFileSync(path.join(dir, f), path.join(dest, `am-${w}.woff2`)); n++; } else console.log('weight', w, 'not found');
}
console.log('Amharic fonts copied:', n);
