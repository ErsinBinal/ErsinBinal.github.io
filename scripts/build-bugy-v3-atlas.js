const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'assets', 'sprites', 'bugy-v3-atlas.svg');
const cell = 96;
const sprites = [
  'bugy-idle',
  'bugy-walk-a',
  'bugy-walk-b',
  'storm-cloud',
  'tornado',
  'portal',
  'ufo',
  'clone-echo',
  'lightning'
];

let body = '';
const colors = {
  ink: '#050505',
  shadow: 'rgba(0,0,0,.42)',
  cyan: '#00eaff',
  green: '#00ff66',
  pink: '#ff2ea6',
  amber: '#f5ff6b',
  paper: '#c9ffd6',
  blueDark: '#12334a',
  blueMid: '#376f88',
  white: '#f6fff8'
};

function add(name, content) {
  const index = sprites.indexOf(name);
  const x = index * cell;
  body += `<g id="${name}" transform="translate(${x} 0)">${content}</g>\n`;
}

const r = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const p = (points, fill) => `<polygon points="${points}" fill="${fill}"/>`;

function bugy(variant = 'idle') {
  const legA = variant === 'walk-a' ? [45, 58] : variant === 'walk-b' ? [50, 54] : [48, 56];
  const legB = variant === 'walk-a' ? [50, 54] : variant === 'walk-b' ? [45, 58] : [48, 56];
  return [
    r(20, 76, 54, 8, colors.shadow),
    r(21, 39, 48, 27, colors.ink),
    r(24, 36, 42, 28, colors.cyan),
    r(28, 39, 32, 8, colors.paper),
    r(30, 50, 20, 5, colors.green),
    r(58, 27, 23, 27, colors.ink),
    r(61, 24, 20, 27, colors.paper),
    r(72, 33, 5, 5, colors.ink),
    r(76, 13, 10, 13, colors.ink),
    r(74, 11, 10, 13, colors.pink),
    r(15, 47, 13, 13, colors.ink),
    r(13, 45, 12, 12, colors.pink),
    r(31, legA[0], 8, 25, colors.ink),
    r(34, legA[0], 7, 22, colors.green),
    r(52, legB[0], 8, 25, colors.ink),
    r(55, legB[0], 7, 22, colors.green),
    r(38, 29, 9, 8, colors.paper),
    r(51, 27, 8, 10, colors.paper),
    variant === 'walk-a' ? r(23, 31, 8, 4, colors.amber) : '',
    variant === 'walk-b' ? r(48, 23, 10, 4, colors.amber) : ''
  ].join('');
}

add('bugy-idle', bugy('idle'));
add('bugy-walk-a', bugy('walk-a'));
add('bugy-walk-b', bugy('walk-b'));

add('storm-cloud', [
  r(16, 62, 64, 8, colors.shadow),
  r(12, 34, 72, 22, colors.ink),
  r(18, 28, 18, 18, colors.ink),
  r(32, 18, 28, 28, colors.ink),
  r(58, 28, 20, 20, colors.ink),
  r(15, 31, 68, 20, colors.blueMid),
  r(22, 25, 18, 18, colors.paper),
  r(36, 14, 27, 27, colors.paper),
  r(60, 25, 19, 19, colors.paper),
  r(19, 47, 58, 8, colors.blueDark),
  r(23, 57, 8, 25, colors.cyan),
  r(43, 61, 8, 24, colors.paper),
  r(63, 57, 8, 25, colors.cyan),
  r(30, 83, 5, 6, colors.cyan),
  r(51, 86, 5, 6, colors.paper),
  r(70, 83, 5, 6, colors.cyan)
].join(''));

add('tornado', [
  r(11, 82, 72, 8, colors.shadow),
  p('8,13 87,9 77,28 66,44 58,62 53,89 39,89 43,66 31,48 19,31', colors.ink),
  p('14,16 80,13 68,27 57,38 50,52 46,82 40,82 45,56 35,42 24,27', colors.paper),
  p('20,25 75,23 66,32 31,39 24,33', colors.cyan),
  p('24,43 66,39 57,51 30,58 22,51', colors.pink),
  p('31,63 59,58 51,72 35,76 27,70', colors.amber),
  r(9, 30, 7, 7, colors.amber),
  r(78, 43, 7, 7, colors.cyan),
  r(18, 65, 6, 6, colors.paper)
].join(''));

add('portal', [
  r(13, 66, 70, 9, colors.shadow),
  p('12,47 22,30 48,22 74,30 84,47 74,64 48,72 22,64', colors.ink),
  p('17,47 26,34 48,27 70,34 79,47 70,60 48,67 26,60', colors.pink),
  p('24,47 32,39 48,34 64,39 72,47 64,55 48,60 32,55', colors.cyan),
  p('33,47 39,43 48,40 57,43 63,47 57,51 48,54 39,51', colors.paper),
  r(11, 28, 7, 7, colors.amber),
  r(76, 33, 7, 7, colors.cyan),
  r(21, 68, 6, 6, colors.paper),
  r(82, 59, 5, 5, colors.pink)
].join(''));

add('ufo', [
  r(14, 75, 68, 8, colors.shadow),
  r(34, 13, 30, 16, colors.ink),
  r(37, 10, 25, 17, colors.paper),
  r(16, 30, 68, 22, colors.ink),
  p('14,41 24,28 74,28 84,41 74,54 24,54', colors.cyan),
  r(27, 43, 7, 5, colors.amber),
  r(45, 45, 7, 5, colors.pink),
  r(63, 43, 7, 5, colors.green),
  p('34,55 62,55 72,90 23,90', 'rgba(0,234,255,.32)')
].join(''));

add('clone-echo', [
  r(15, 76, 54, 8, colors.shadow),
  r(14, 39, 35, 27, 'rgba(0,234,255,.42)'),
  r(40, 35, 35, 27, 'rgba(255,46,166,.42)'),
  r(26, 30, 42, 36, colors.ink),
  r(30, 27, 36, 35, colors.cyan),
  r(39, 38, 23, 7, colors.paper),
  r(57, 32, 5, 5, colors.ink)
].join(''));

add('lightning', [
  r(36, 8, 20, 80, colors.ink),
  p('43,8 63,8 52,35 69,35 32,90 41,53 25,53 40,29', colors.amber),
  r(48, 12, 8, 13, colors.white),
  r(41, 56, 7, 14, colors.white)
].join(''));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sprites.length * cell}" height="${cell}" viewBox="0 0 ${sprites.length * cell} ${cell}" shape-rendering="crispEdges">
<rect width="100%" height="100%" fill="none"/>
${body}</svg>
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, svg);
console.log(`wrote ${out}`);
