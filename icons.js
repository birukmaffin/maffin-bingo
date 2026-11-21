/* MAFFIN BINGO - icon set (inline SVG, drawn to match the purple/gold theme) */
(function (root) {
'use strict';
const P = {
  play: '<path d="M7 4.8v14.4a1 1 0 0 0 1.5.9l11.6-7.2a1 1 0 0 0 0-1.8L8.5 3.9A1 1 0 0 0 7 4.8z" fill="currentColor"/>',
  pause: '<rect x="6" y="4.5" width="4.2" height="15" rx="1.4" fill="currentColor"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4" fill="currentColor"/>',
  sparkle: '<path d="M12 2.5l2.2 6.1 6.3 2.4-6.3 2.4L12 19.5l-2.2-6.1-6.3-2.4 6.3-2.4z"/><path d="M19 3v4M17 5h4"/>',
  ball: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.2"/><path d="M6.6 8.2A6.6 6.6 0 0 1 10 5.6"/>',
  ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14.5 6.5v11" stroke-dasharray="1.6 2.2"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17.2 14a4.8 4.8 0 0 1 4.3 5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.6 9.3c-.5-1-1.5-1.5-2.6-1.5-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2.1 2.6.9 2.6 2.1-1.1 2-2.6 2c-1.1 0-2.1-.5-2.6-1.5M12 5.8v2M12 16.2v2"/>',
  sliders: '<path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M21 18h-1"/><circle cx="16" cy="6" r="2.4"/><circle cx="10" cy="12" r="2.4"/><circle cx="18" cy="18" r="2.4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.6a2.7 2.7 0 1 1 3.7 2.5c-.7.4-1.1 1-1.1 1.8M12 17.2h.01"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  trophy: '<path d="M8 4h8v5.2a4 4 0 0 1-8 0z"/><path d="M8 6H4.5v1.2A3.8 3.8 0 0 0 8 11M16 6h3.5v1.2A3.8 3.8 0 0 1 16 11M12 13.2V17M8.5 21h7M9.8 17h4.4"/>',
  print: '<path d="M7 9V3.5h10V9"/><rect x="3" y="9" width="18" height="8" rx="2.2"/><path d="M7 14h10v6.5H7z"/>',
  speaker: '<path d="M4 9.5v5h3.8l5.2 4V5.5l-5.2 4z"/><path d="M16.3 8.8a4.6 4.6 0 0 1 0 6.4M18.9 6.3a8.2 8.2 0 0 1 0 11.4"/>',
  speakerOff: '<path d="M4 9.5v5h3.8l5.2 4V5.5l-5.2 4z"/><path d="M17 9.5l4.5 5M21.5 9.5l-4.5 5"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  pencil: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0 0-3l-1-1a2.1 2.1 0 0 0-3 0L4 16z"/><path d="M13.5 6.5l4 4"/>',
  repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H20"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H4"/>',
  save: '<path d="M12 3v11.5M7.5 10.2l4.5 4.5 4.5-4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  restore: '<path d="M12 15.5V4M7.5 8.3L12 3.8l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  export: '<path d="M14 3h7v7M21 3l-9 9"/><path d="M19 14v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h4"/>',
  search: '<circle cx="11" cy="11" r="6.8"/><path d="M20.5 20.5l-4.7-4.7"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="2.4"/><path d="M8 11V7.2a4 4 0 0 1 7.6-1.7"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2.4"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  key: '<circle cx="8" cy="15.5" r="4.2"/><path d="M11 12.5L20.5 3M16.5 7l3 3M14 9.5l2.5 2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6h.01"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M7.8 12.4l3 3 5.6-6.3"/>',
  tick: '<path d="M5 12.8l4.6 4.6L19 7.5"/>',
  xcircle: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  warn: '<path d="M12 3.2l10 17.6H2z"/><path d="M12 10v4.6M12 17.6h.01"/>',
  crown: '<path d="M3 8l4.6 4.2L12 4.5l4.4 7.7L21 8l-1.8 11H4.8z"/><path d="M5 21h14"/>',
  reset: '<path d="M4 4.5v5.5h5.5"/><path d="M5.2 14.5a8 8 0 1 0 1.1-7.9L4 10"/>',
  tv: '<rect x="3" y="4.5" width="18" height="12.5" rx="2.4"/><path d="M8 21h8M12 17v4"/>',
  cast: '<path d="M3 8V6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5H15"/><path d="M3 12.2a7.8 7.8 0 0 1 7.8 7.8M3 16.2a3.8 3.8 0 0 1 3.8 3.8M3 20h.01"/>',
  phone: '<path d="M5 3.5h3.8l1.9 4.9-2.4 1.5a11 11 0 0 0 5.8 5.8l1.5-2.4 4.9 1.9V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.4"/><path d="M3.5 7.5L12 14l8.5-6.5"/>',
  telegram: '<path d="M21 4L3 11l6 2.4L10.8 20l3.2-4 5 3.6z"/><path d="M9 13.4L21 4"/>',
  pin: '<path d="M12 21.5s7-6 7-11.5a7 7 0 0 0-14 0c0 5.5 7 11.5 7 11.5z"/><circle cx="12" cy="10" r="2.6"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.8 2H4.2z"/><path d="M10 21.5h4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9.2C7.4 20 4 17 4 12V6z"/><path d="M8.8 12l2.2 2.3 4.2-4.6"/>',
  copy: '<rect x="9" y="9" width="11.5" height="11.5" rx="2.4"/><path d="M5.5 15.5V6.5a2 2 0 0 1 2-2h9"/>',
  star: '<path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.6 6.8 19.4l1-5.9L3.5 9.4l5.9-.8z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'
};
root.ic = function (n, size) {
  const s = size ? ` style="width:${size}px;height:${size}px"` : '';
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${s}>${P[n] || ''}</svg>`;
};
root.ic.names = Object.keys(P);
if (typeof module !== 'undefined' && module.exports) module.exports = root.ic;
})(typeof window !== 'undefined' ? window : globalThis);

/* Maffin crown logo (used on the home screen, lock screen, TV mode) */
(function (root) {
root.crownSVG = function (w) {
  return `<svg width="${w || 84}" viewBox="0 0 140 120" role="img" aria-label="Maffin Bingo crown"><defs>
<linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6b8"/><stop offset=".45" stop-color="#ffcf3a"/><stop offset="1" stop-color="#c47a00"/></linearGradient>
<linearGradient id="cg2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e49a00"/><stop offset=".5" stop-color="#fff0a0"/><stop offset="1" stop-color="#e49a00"/></linearGradient>
<radialGradient id="rr" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ff6f8d"/><stop offset="1" stop-color="#a3102f"/></radialGradient>
<radialGradient id="rg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#4be88f"/><stop offset="1" stop-color="#0a7a3a"/></radialGradient>
<radialGradient id="rb" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#63b0ff"/><stop offset="1" stop-color="#1450a8"/></radialGradient></defs>
<ellipse cx="70" cy="113" rx="50" ry="4.5" fill="#000" opacity=".28"/>
<path d="M20 96 L10 40 L42 68 L70 24 L98 68 L130 40 L120 96 Z" fill="url(#cg1)" stroke="#8a5600" stroke-width="3.2" stroke-linejoin="round"/>
<path d="M42 68 L50 96 M70 24 L70 96 M98 68 L90 96" stroke="#a86b00" stroke-width="2" opacity=".5" fill="none"/>
<path d="M26 89 L18 52 L39 70" stroke="#fff8c8" stroke-width="2.6" opacity=".75" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="17" y="94" width="106" height="17" rx="6" fill="url(#cg2)" stroke="#8a5600" stroke-width="3"/>
<circle cx="38" cy="102.5" r="4" fill="url(#rb)"/><circle cx="70" cy="102.5" r="4.6" fill="url(#rr)"/><circle cx="102" cy="102.5" r="4" fill="url(#rg)"/>
<circle cx="10" cy="36" r="8.5" fill="url(#rr)" stroke="#8a5600" stroke-width="2.2"/><circle cx="70" cy="18" r="9.6" fill="url(#rg)" stroke="#8a5600" stroke-width="2.2"/><circle cx="130" cy="36" r="8.5" fill="url(#rb)" stroke="#8a5600" stroke-width="2.2"/>
<circle cx="7.4" cy="33.2" r="2" fill="#fff" opacity=".9"/><circle cx="66.8" cy="14.6" r="2.3" fill="#fff" opacity=".9"/><circle cx="127.4" cy="33.2" r="2" fill="#fff" opacity=".9"/>
<path d="M118 8l1.8 4.6 4.6 1.8-4.6 1.8L118 21l-1.8-4.8-4.6-1.8 4.6-1.8z" fill="#fff6b8"/>
</svg>`;
};
})(typeof window !== 'undefined' ? window : globalThis);
