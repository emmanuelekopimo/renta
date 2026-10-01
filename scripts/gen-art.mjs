// Generates Renta's brand logo and the six property cover illustrations.
// Run: node scripts/gen-art.mjs
import fs from 'node:fs';
import path from 'node:path';

const out = path.join(process.cwd(), 'public', 'img');
fs.mkdirSync(path.join(out, 'properties'), { recursive: true });

const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="18" fill="#34D186"/>
  <path d="M14 30 L32 15 L50 30" fill="none" stroke="#101814" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M22 49 V33 h12 a7 7 0 0 1 0 14 h-7 l10 2" fill="none" stroke="#101814" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="45" cy="47" r="3.2" fill="#fff"/>
</svg>`;
fs.writeFileSync(path.join(out, 'logo.svg'), logo);
fs.writeFileSync(path.join(process.cwd(), 'src', 'app', 'icon.svg'), logo);

const sky = (id, a, b) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="640" height="360" fill="url(#${id})"/>`;
const sun = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity=".9"/>`;
const cloud = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".85"><ellipse cx="0" cy="0" rx="34" ry="14"/><ellipse cx="22" cy="-8" rx="22" ry="14"/><ellipse cx="-18" cy="-4" rx="18" ry="11"/></g>`;
const ground = (c) => `<rect y="300" width="640" height="60" fill="${c}"/>`;
const tree = (x, y, s = 1, c = '#1f9a5e') =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="0" width="8" height="34" rx="3" fill="#7a4e2d"/><circle cx="0" cy="-8" r="24" fill="${c}"/><circle cx="-14" cy="4" r="16" fill="${c}"/><circle cx="14" cy="4" r="16" fill="${c}"/></g>`;
const palm = (x, y) =>
  `<g transform="translate(${x} ${y})"><path d="M0 0 C4 -40 2 -70 8 -100" stroke="#8a5a35" stroke-width="8" fill="none" stroke-linecap="round"/>${[-60, -20, 20, 60, 100, 150]
    .map((a) => `<path d="M8 -100 q30 -20 60 6" transform="rotate(${a} 8 -100)" stroke="#23a464" stroke-width="10" fill="none" stroke-linecap="round"/>`)
    .join('')}</g>`;
const windows = (x0, y0, cols, rows, w, h, gx, gy, lit = '#ffe7a3', dark = '#bfe9ff') => {
  let s = '';
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      s += `<rect x="${x0 + c * (w + gx)}" y="${y0 + r * (h + gy)}" width="${w}" height="${h}" rx="3" fill="${(r * 7 + c * 3) % 5 === 0 ? lit : dark}"/>`;
  return s;
};

const scenes = {
  // Apartment block
  'home-1': `${sky('s1', '#bff3da', '#effcf5')}${sun(520, 80, 38, '#ffd166')}${cloud(150, 70)}${cloud(420, 110, 0.8)}
    ${ground('#9be3bd')}
    <rect x="200" y="70" width="240" height="235" rx="10" fill="#ffffff"/><rect x="200" y="70" width="240" height="20" rx="10" fill="#34d186"/>
    ${windows(222, 104, 5, 6, 30, 22, 13, 12)}
    <rect x="296" y="262" width="48" height="43" rx="6" fill="#101814"/>
    <rect x="110" y="170" width="90" height="135" rx="8" fill="#e8f0ec"/>${windows(124, 186, 2, 4, 26, 20, 10, 10)}
    <rect x="440" y="150" width="96" height="155" rx="8" fill="#e8f0ec"/>${windows(454, 166, 2, 5, 28, 20, 12, 8)}
    ${tree(80, 266)}${tree(570, 266, 0.9)}`,
  // Duplex
  'home-2': `${sky('s2', '#ffd8b5', '#fff4e6')}${sun(110, 90, 46, '#ff9f5a')}${cloud(470, 70)}
    ${ground('#a8e6c4')}
    <rect x="150" y="150" width="170" height="155" fill="#fdfdfd"/><path d="M135 155 L235 85 L335 155 Z" fill="#101814"/>
    <rect x="320" y="150" width="170" height="155" fill="#f1f6f3"/><path d="M305 155 L405 85 L505 155 Z" fill="#2bb673"/>
    ${windows(172, 175, 3, 2, 34, 30, 16, 22)}${windows(342, 175, 3, 2, 34, 30, 16, 22)}
    <rect x="215" y="255" width="40" height="50" rx="5" fill="#34d186"/><rect x="385" y="255" width="40" height="50" rx="5" fill="#101814"/>
    <rect x="120" y="295" width="400" height="10" rx="3" fill="#7fd5a6"/>${tree(80, 268, 1, '#2bb673')}${tree(565, 268, 1.1)}`,
  // Villa
  'home-3': `${sky('s3', '#b9e3ff', '#eef8ff')}${sun(540, 70, 34, '#ffe066')}${cloud(200, 60, 1.1)}${cloud(380, 95, 0.7)}
    ${ground('#8edcb3')}
    <rect x="170" y="160" width="300" height="145" rx="6" fill="#fff"/><path d="M150 168 L320 92 L490 168 Z" fill="#c2553f"/>
    <rect x="260" y="200" width="120" height="105" fill="#e8f0ec"/><rect x="295" y="235" width="50" height="70" rx="6" fill="#101814"/>
    ${windows(190, 195, 1, 2, 50, 36, 0, 18)}${windows(400, 195, 1, 2, 50, 36, 0, 18)}
    <rect x="100" y="285" width="440" height="20" rx="4" fill="#5fc8f0" opacity=".85"/>
    ${palm(110, 300)}${palm(560, 300)}`,
  // Studio lofts
  'home-4': `${sky('s4', '#ddd6fe', '#f5f3ff')}${sun(120, 70, 30, '#fbcfe8')}${cloud(480, 70)}
    ${ground('#9be3bd')}
    <rect x="130" y="120" width="380" height="185" rx="8" fill="#b4533a"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="130" y="${128 + i * 15}" width="380" height="2" fill="#9a4331" opacity=".5"/>`).join('')}
    ${windows(152, 140, 4, 2, 70, 50, 22, 22, '#ffe7a3', '#dbeafe')}
    <rect x="290" y="262" width="60" height="43" rx="4" fill="#101814"/><rect x="130" y="112" width="380" height="12" rx="4" fill="#101814"/>
    ${tree(80, 266, 0.9)}${tree(565, 266, 1)}`,
  // Shops
  'home-5': `${sky('s5', '#ffe3c2', '#fff8ee')}${sun(520, 76, 36, '#ffb703')}${cloud(160, 70)}
    ${ground('#c9d6cf')}
    <rect x="90" y="130" width="460" height="175" rx="8" fill="#ffffff"/>
    ${[0, 1, 2]
      .map((i) => {
        const x = 106 + i * 148;
        const c = ['#34d186', '#101814', '#f59e0b'][i];
        return `<path d="M${x} 150 h132 v26 ${Array.from({ length: 6 }, () => 'q-11 14 -22 0').join(' ')} z" fill="${c}"/><rect x="${x + 8}" y="196" width="116" height="70" rx="4" fill="#dbeafe"/><rect x="${x + 50}" y="266" width="32" height="39" fill="#e8f0ec"/>`;
      })
      .join('')}
    <rect x="90" y="122" width="460" height="16" rx="6" fill="#101814"/>`,
  // Glass tower
  'home-6': `${sky('s6', '#1b2a4a', '#3a5a8c')}${sun(110, 80, 26, '#fef3c7')}
    ${Array.from({ length: 18 }, (_, i) => `<circle cx="${(i * 97) % 640}" cy="${20 + ((i * 53) % 120)}" r="1.6" fill="#fff" opacity=".8"/>`).join('')}
    ${ground('#1f3d32')}
    <rect x="250" y="40" width="140" height="265" rx="6" fill="#2f6f8f"/>${windows(262, 54, 4, 11, 25, 16, 7, 6, '#ffe7a3', '#5fa8c9')}
    <rect x="150" y="150" width="100" height="155" rx="6" fill="#26506a"/>${windows(160, 164, 3, 6, 22, 14, 9, 8, '#ffe7a3', '#4a87a6')}
    <rect x="390" y="120" width="110" height="185" rx="6" fill="#26506a"/>${windows(402, 134, 3, 8, 24, 14, 10, 7, '#ffe7a3', '#4a87a6')}
    <rect x="250" y="34" width="140" height="10" rx="4" fill="#34d186"/>`,
};

for (const [name, body] of Object.entries(scenes)) {
  fs.writeFileSync(
    path.join(out, 'properties', `${name}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice">${body}</svg>`,
  );
}
console.log('Generated logo and', Object.keys(scenes).length, 'property illustrations');
