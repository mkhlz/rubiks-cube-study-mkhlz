/**
 * Theory: a one-stop reference on the cube, written to be read for fun.
 * Every mathematical number here is checked in tests/theory.test.ts
 * (engine-verified move orders and piece counts, arithmetic for state
 * counts). History, records and people come from the sources listed in
 * the last chapter; records are dated because they keep falling.
 */
import type { Section } from './curriculum';
import { applyAlg, invertAlg, solvedState } from '../cube/engine';
import { isoDiagram, llDiagram, netDiagram } from '../cube/diagram';
import { MASKS } from '../cube/masks';
import { PHOTOS } from './photos';

export interface Chapter {
  id: string;
  title: string;
  kicker: string;
  /** Part heading shown above the chapter in the table of contents. */
  part?: string;
  sections: Section[];
}

/** When the records tables were last checked against the sources. */
export const RECORDS_AS_OF = 'early October 2026';

const alg = (s: string) => `<code class="alg">${s}</code>`;
const caseOf = (a: string) => applyAlg(solvedState(), invertAlg(a));
const link = (href: string, text: string) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
const WCA = 'https://www.worldcubeassociation.org';

const fig = (html: string, caption: string): Section => ({ t: 'figure', html, caption });

const trio = () => `<div class="fig-row">
  <figure>${isoDiagram(solvedState(), 130, MASKS.centers)}<figcaption><b>6 centres</b><br>fixed, they <i>are</i> the colour scheme</figcaption></figure>
  <figure>${isoDiagram(solvedState(), 130, (h) => h.filter((v) => v !== 0).length === 2)}<figcaption><b>12 edges</b><br>2 stickers, 2 orientations</figcaption></figure>
  <figure>${isoDiagram(solvedState(), 130, (h) => h.every((v) => v !== 0))}<figcaption><b>8 corners</b><br>3 stickers, 3 orientations</figcaption></figure>
</div>`;

const bigNumber = () => `<div class="big-number">
  <span class="num">43,252,003,274,489,856,000</span>
  <span class="eq">= 8! × 3<sup>7</sup> × 12! × 2<sup>11</sup> ÷ 2</span>
  <span class="note">corner places × corner twists × edge places × edge flips ÷ parity</span>
</div>`;

const ollVsPll = () => `<div class="fig-row">
  <figure>${llDiagram(caseOf("R U R' U R U2 R'"), 'oll', 140)}<figcaption><b>Orientation</b> problem<br>"which way is each piece facing?"</figcaption></figure>
  <figure class="arrow-fig" aria-hidden="true">→</figure>
  <figure>${llDiagram(caseOf("R U R' U' R' F R2 U' R' U' R U R' F'"), 'full', 140)}<figcaption><b>Permutation</b> problem<br>"is each piece in the right place?"</figcaption></figure>
</div>`;

const schemes = () => `<div class="fig-row">
  <figure>${netDiagram(solvedState(), 240)}<figcaption><b>Western scheme</b> (this app)<br>white ↔ yellow · green ↔ blue · red ↔ orange</figcaption></figure>
  <figure>${isoDiagram(applyAlg(solvedState(), 'y'), 150)}<figcaption><b>"BOY"</b>: blue, orange, yellow<br>go clockwise round one corner</figcaption></figure>
</div>`;

const patterns = () => `<div class="fig-row">
  ${[
    ['Checkerboard', 'M2 E2 S2'],
    ['Cube in a cube', "F L F U' R U F2 L2 U' L' B D' B' L2 U"],
    ['Superflip', "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2"],
    ['Six spots', "U D' R L' F B' U D'"],
  ]
    .map(([n, a]) => `<figure>${isoDiagram(applyAlg(solvedState(), a), 120)}<figcaption><b>${n}</b></figcaption></figure>`)
    .join('')}
</div>`;

/** Single-series bar chart: average move count by method. */
function methodsChart() {
  const rows: [string, number, string][] = [
    ['Beginner (this app)', 150, 'Layer by layer, 7 algorithms'],
    ['4-look CFOP', 75, 'CFOP with 2-look OLL and PLL'],
    ['Full CFOP', 57, 'Cross, F2L, OLL, PLL'],
    ['ZZ', 52, 'Edges first, then R/U/L only'],
    ['Roux', 47, 'Blocks + M slices'],
    ['Petrus', 47, 'Block building'],
    ['Fewest Moves (human, 1 hour)', 25, 'Pen, paper, patience'],
    ['Computer (two-phase)', 20, 'Kociemba / min2phase'],
  ];
  const W = 640, labelW = 210, barMax = 360, rowH = 34, top = 8;
  const H = top + rows.length * rowH + 28;
  const x = (v: number) => (v / 150) * barMax;
  const bars = rows
    .map(([name, v, desc], i) => {
      const y = top + i * rowH;
      const w = x(v);
      return `<g class="bar-row"><title>${name}: about ${v} moves. ${desc}</title>
        <rect class="hit" x="0" y="${y}" width="${W}" height="${rowH}" fill="transparent"/>
        <text x="${labelW - 10}" y="${y + rowH / 2 + 5}" text-anchor="end" class="lbl">${name}</text>
        <path d="M${labelW} ${y + 7} h${w - 4} a4 4 0 0 1 4 4 v12 a4 4 0 0 1 -4 4 h${-(w - 4)} z" class="bar"/>
        <text x="${labelW + w + 8}" y="${y + rowH / 2 + 5}" class="val">≈${v}</text></g>`;
    })
    .join('');
  const ticks = [0, 50, 100, 150]
    .map((t) => `<line x1="${labelW + x(t)}" x2="${labelW + x(t)}" y1="${top}" y2="${H - 22}" class="grid"/><text x="${labelW + x(t)}" y="${H - 6}" text-anchor="middle" class="tick">${t}</text>`)
    .join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Average number of moves by solving method">${ticks}${bars}</svg>
  <table class="sr-only"><caption>Average moves per solve</caption><tr><th>Method</th><th>Moves</th></tr>${rows.map(([n, v]) => `<tr><td>${n}</td><td>${v}</td></tr>`).join('')}</table>`;
}

/**
 * How many positions sit at each distance from solved (half-turn metric).
 * 0-15 are exact counts; 16-20 are the published estimates.
 */
export const DISTANCES: [number, string, number, boolean][] = [
  [0, '1', 1, true],
  [1, '18', 18, true],
  [2, '243', 243, true],
  [3, '3,240', 3240, true],
  [4, '43,239', 43239, true],
  [5, '574,908', 574908, true],
  [6, '7,618,438', 7618438, true],
  [7, '100,803,036', 100803036, true],
  [8, '1,332,343,288', 1332343288, true],
  [9, '17,596,479,795', 17596479795, true],
  [10, '232,248,063,316', 232248063316, true],
  [11, '3,063,288,809,012', 3063288809012, true],
  [12, '40,374,425,656,248', 40374425656248, true],
  [13, '531,653,418,284,628', 531653418284628, true],
  [14, '6,989,320,578,825,358', 6989320578825358, true],
  [15, '91,365,146,187,124,313', 91365146187124313, true],
  [16, '≈ 1.1 × 10¹⁸', 1.1e18, false],
  [17, '≈ 1.2 × 10¹⁹', 1.2e19, false],
  [18, '≈ 2.9 × 10¹⁹', 2.9e19, false],
  [19, '≈ 1.5 × 10¹⁸', 1.5e18, false],
  [20, '≈ 490 million', 4.9e8, false],
];

/** Log-scale column chart of DISTANCES. */
function distanceChart() {
  const W = 660, H = 270, left = 44, bottom = 34, top = 14;
  const plotW = W - left - 10, plotH = H - bottom - top;
  const colW = plotW / DISTANCES.length;
  const y = (v: number) => top + plotH - (Math.log10(v) / 20) * plotH;
  const grid = [0, 5, 10, 15, 20]
    .map((p) => `<line x1="${left}" x2="${W - 10}" y1="${y(10 ** p)}" y2="${y(10 ** p)}" class="grid"/><text x="${left - 6}" y="${y(10 ** p) + 4}" text-anchor="end" class="tick">10${p ? `<tspan dy="-5" font-size="8">${p}</tspan>` : '⁰'}</text>`)
    .join('');
  const cols = DISTANCES.map(([d, label, v, exact], i) => {
    const x = left + i * colW + 3;
    const top0 = Math.min(y(v), y(1) - 3);
    const h = y(1) - top0;
    const w = colW - 6;
    return `<g class="bar-row"><title>${d} moves: ${label} positions${exact ? '' : ' (estimate)'}</title>
      <rect class="hit" x="${x - 3}" y="${top}" width="${colW}" height="${plotH}" fill="transparent"/>
      <path d="M${x} ${y(1)} v${-(h - 4)} a4 4 0 0 1 4 -4 h${w - 8} a4 4 0 0 1 4 4 v${h - 4} z" class="bar${exact ? '' : ' est'}"/>
      <text x="${x + w / 2}" y="${H - bottom + 16}" text-anchor="middle" class="tick">${d}</text></g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Number of cube positions at each distance from solved, log scale">${grid}${cols}
    <text x="${left + plotW / 2}" y="${H - 2}" text-anchor="middle" class="tick">moves needed to solve (half-turn metric)</text></svg>
  <table class="sr-only"><caption>Positions by distance</caption><tr><th>Moves</th><th>Positions</th></tr>${DISTANCES.map(([d, l]) => `<tr><td>${d}</td><td>${l}</td></tr>`).join('')}</table>`;
}

/** 3x3 single world record milestones: [year (decimal), seconds, holder]. */
export const WR_SINGLE: [number, number, string][] = [
  [1982.4, 22.95, 'Minh Thai'],
  [2003.6, 16.53, 'Jess Bonde'],
  [2004.5, 12.11, 'Shotaro Makisumi'],
  [2005.5, 11.75, 'Jean Pons'],
  [2007.5, 9.86, 'Thibaut Jacquinot'],
  [2008.2, 8.72, 'Yu Nakajima'],
  [2008.6, 7.08, 'Erik Akkersdijk'],
  [2010.9, 6.77, 'Feliks Zemdegs'],
  [2011.5, 5.66, 'Feliks Zemdegs'],
  [2013.2, 5.55, 'Mats Valk'],
  [2015.9, 4.9, 'Lucas Etter'],
  [2016.9, 4.73, 'Feliks Zemdegs'],
  [2017.8, 4.59, 'SeungBeom Cho'],
  [2018.4, 4.22, 'Feliks Zemdegs'],
  [2018.9, 3.47, 'Yusheng Du'],
  [2023.5, 3.13, 'Max Park'],
  [2025.3, 3.05, 'Xuanyi Geng'],
  [2026.1, 2.76, 'Teodor Zajder'],
  [2026.8, 2.51, 'Xuanyi Geng'],
];

/** Step line of WR_SINGLE, 2003 onwards (1982 is called out in the text). */
function recordChart() {
  const pts = WR_SINGLE.filter(([yr]) => yr > 2000);
  const W = 660, H = 290, left = 40, right = 16, top = 14, bottom = 30;
  const x0 = 2003, x1 = 2027;
  const x = (yr: number) => left + ((yr - x0) / (x1 - x0)) * (W - left - right);
  const y = (s: number) => top + (1 - s / 18) * (H - top - bottom);
  let d = `M${x(pts[0][0])} ${y(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += ` H${x(pts[i][0])} V${y(pts[i][1])}`;
  d += ` H${x(x1)}`;
  const labelled = new Set(['Jess Bonde', 'Erik Akkersdijk', 'Yusheng Du', 'Max Park']);
  const dots = pts
    .map(([yr, s, who], i) => {
      const last = i === pts.length - 1;
      const lab = labelled.has(who) && !(who === 'Feliks Zemdegs');
      return `<g class="pt"><title>${s.toFixed(2)} s · ${who} · ${Math.floor(yr)}</title>
        <circle cx="${x(yr)}" cy="${y(s)}" r="12" fill="transparent"/>
        <circle cx="${x(yr)}" cy="${y(s)}" r="${last ? 6 : 4.5}" class="dot${last ? ' last' : ''}"/>
        ${lab ? `<text x="${x(yr) + 8}" y="${y(s) - 9}" class="val">${s.toFixed(2)} ${who.split(' ')[1] ?? who}</text>` : ''}
        ${last ? `<text x="${x(yr) - 6}" y="${y(s) + 22}" text-anchor="end" class="val strong">${s.toFixed(2)} Geng</text>` : ''}</g>`;
    })
    .join('');
  const yt = [0, 5, 10, 15].map((s) => `<line x1="${left}" x2="${W - right}" y1="${y(s)}" y2="${y(s)}" class="grid"/><text x="${left - 6}" y="${y(s) + 4}" text-anchor="end" class="tick">${s}s</text>`).join('');
  const xt = [2003, 2008, 2013, 2018, 2023, 2027].map((yr) => `<text x="${x(yr)}" y="${H - 8}" text-anchor="middle" class="tick">${yr}</text>`).join('');
  return `<svg class="chart line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="3x3 single world record over time, from 16.53 seconds in 2003 to 2.51 seconds in 2026">${yt}${xt}
    <path d="${d}" class="step"/>${dots}</svg>
  <table class="sr-only"><caption>3x3 single world record milestones</caption><tr><th>Year</th><th>Time</th><th>Holder</th></tr>${WR_SINGLE.map(([yr, s, w]) => `<tr><td>${Math.floor(yr)}</td><td>${s}</td><td>${w}</td></tr>`).join('')}</table>`;
}

/** Kociemba's two-phase funnel. */
function funnel() {
  return `<svg class="funnel" viewBox="0 0 700 250" role="img" aria-label="Two-phase algorithm: all positions, then subgroup G1, then solved">
    <path d="M20 20 H620 L470 120 H170 Z" class="f1"/>
    <path d="M170 128 H470 L360 200 H280 Z" class="f2"/>
    <circle cx="320" cy="226" r="16" class="f3"/>
    <text x="320" y="52" text-anchor="middle" class="big">All positions</text>
    <text x="320" y="76" text-anchor="middle" class="small">43 quintillion · anything goes</text>
    <text x="320" y="150" text-anchor="middle" class="big ink">G1</text>
    <text x="320" y="172" text-anchor="middle" class="small ink">19.5 billion</text>
    <text x="320" y="231" text-anchor="middle" class="tiny">✓</text>
    <text x="545" y="80" class="side">Phase 1</text><text x="545" y="98" class="side small">any move: orient</text><text x="545" y="114" class="side small">everything</text>
    <text x="410" y="190" class="side">Phase 2</text><text x="410" y="208" class="side small">U, D + half turns</text>
  </svg>`;
}

/** Labelled cut-away of the mechanism. */
function mechanism() {
  return `<svg class="mech" viewBox="0 0 640 300" role="img" aria-label="Exploded diagram: core with six arms, centre cap with screw and spring, an edge with its foot, and a corner with its foot">
    <g class="core"><circle cx="150" cy="150" r="34"/><rect x="138" y="40" width="24" height="76" rx="6"/><rect x="138" y="184" width="24" height="76" rx="6"/><rect x="40" y="138" width="76" height="24" rx="6"/><rect x="184" y="138" width="76" height="24" rx="6"/></g>
    <rect x="128" y="18" width="44" height="30" rx="7" class="cap"/>
    <path d="M150 54 v58" class="screw"/><path d="M140 66 l20 6 l-20 6 l20 6 l-20 6 l20 6" class="spring"/>
    <text x="150" y="285" text-anchor="middle" class="lbl">Core + 6 centres</text>
    <text x="196" y="30" class="note">centre cap</text><text x="168" y="78" class="note">screw + spring</text><text x="196" y="122" class="note">set the tension</text>
    <g transform="translate(330 70)"><path d="M0 40 h90 v90 h-90 z" class="piece"/><path d="M0 40 l26 -26 h90 l-26 26 z" class="piece top"/><path d="M90 40 l26 -26 v90 l-26 26 z" class="piece side"/><path d="M30 130 q15 40 40 40 q20 0 22 -24" class="foot"/></g>
    <text x="390" y="285" text-anchor="middle" class="lbl">Edge</text><text x="390" y="262" text-anchor="middle" class="note">its foot hooks under the centres</text>
    <g transform="translate(500 70)"><path d="M0 40 h90 v90 h-90 z" class="piece"/><path d="M0 40 l26 -26 h90 l-26 26 z" class="piece top2"/><path d="M90 40 l26 -26 v90 l-26 26 z" class="piece side2"/><path d="M60 130 q20 30 44 30" class="foot"/></g>
    <text x="560" y="285" text-anchor="middle" class="lbl">Corner</text><text x="560" y="262" text-anchor="middle" class="note">held in by the edges' feet</text>
  </svg>`;
}

const photo = (p: keyof typeof PHOTOS, caption: string, float?: 'left' | 'right'): Section => ({ t: 'photo', photo: PHOTOS[p], caption, float });

export const CHAPTERS: Chapter[] = [
  // ───────────────────────── Part I · The object ─────────────────────────
  {
    id: 'history',
    part: 'The object',
    title: 'A teaching aid that escaped',
    kicker: 'Chapter 1 · Origins, 1974 to today',
    sections: [
      photo('rubik', 'Ernő Rubik (born 1944), architect, sculptor and design teacher, photographed in 2014.', 'right'),
      { t: 'p', html: `In 1974, <b>Ernő Rubik</b>, who taught design and architecture in the Department of Interior Design at the Academy of Applied Arts and Crafts in Budapest, was looking for a way to show how objects can move in three dimensions. The real problem was structural: <b>how can every face of a cube turn without the whole thing falling apart?</b>` },
      { t: 'p', html: `His answer was a hidden core and pieces whose rounded inner "feet" hook into each other, so the cube literally holds itself together. He added coloured stickers to see the movement, turned a few faces, and discovered he could not put it back. By his own account it took him about <b>a month</b> to solve his own invention. He had built a puzzle by accident.` },
      { t: 'h', text: 'From Budapest to the world' },
      {
        t: 'timeline',
        items: [
          ['1970-72', `<b>An earlier idea.</b> American chemist Larry Nichols files a patent for a 2×2×2 puzzle held together by magnets (granted 1972). It never became the cube, but it later cost the cube's distributor a lawsuit.`],
          ['1974', `<b>The prototype.</b> Rubik builds and scrambles his first "Magic Cube" in Budapest.`],
          ['1975', `<b>Hungarian patent.</b> Filed on 30 January, granted later that year (HU 170062).`],
          ['1976', `<b>A twin in Japan.</b> Engineer Terutoshi Ishigi patents an almost identical mechanism, generally accepted as an independent reinvention.`],
          ['1977', `<b>First shops.</b> Test batches go on sale in Budapest toy shops as the <i>Bűvös kocka</i> (Magic Cube).`],
          ['1979', `<b>The deal.</b> Shown at the Nuremberg Toy Fair, it catches the eye of toy expert Tom Kremer (Seven Towns). In September, Ideal Toy Corporation signs on to sell it worldwide.`],
          ['1980', `<b>Rename and launch.</b> Ideal wanted a distinctive name it could trademark; "Gordian Knot" and "Inca Gold" were considered before it settled on <b>Rubik's Cube</b>. It wins Germany's Game of the Year special prize for best puzzle.`],
          ['1980-83', `<b>Cubemania.</b> Around 200 million cubes are sold, including countless knock-offs. Solution booklets top bestseller lists. Then the craze fades almost as fast as it arrived.`],
          ['1982', `<b>First world championship</b> in Budapest, won by Minh Thai in 22.95 s.`],
          ['2000', `<b>Patent expires.</b> Rubik's US patent (1983) runs out, and new makers are free to rethink the mechanism.`],
          ['2003-04', `<b>The sport is reborn.</b> A world championship in Toronto (2003) leads to the <b>World Cube Association</b> in 2004.`],
          ['2010s', `<b>Speedcube revolution.</b> Small Chinese makers race to build faster, lighter cubes: adjustable springs, corner cutting, factory lube, then magnets. Records collapse.`],
          ['2014', `<b>40th birthday.</b> Google marks it with an interactive Doodle; the cube enters the US National Toy Hall of Fame.`],
          ['2020-21', `<b>New owner.</b> Spin Master agrees to buy the Rubik's brand for about $50 million.`],
          ['2024', `<b>≈ 500 million sold.</b> The best-selling puzzle of all time, before counting the clones.`],
          ['2026', `<b>Sub-3 seconds.</b> The 3×3 single record falls below three seconds for the first time (2.76, then 2.51).`],
        ],
      },
      photo('original1980', 'A 1980 Ideal-era cube made in Hungary. Black plastic body, stickers, and a stiff, clunky turn that today\'s speedcubers would barely recognise.', 'left'),
      { t: 'p', html: `The early cubes were stiff. Turning took real force, corners popped out if a face was even slightly misaligned, and stickers peeled. That shaped how people solved them: slowly, carefully, with methods that minimised moves rather than maximised speed.` },
      { t: 'p', html: `The Nichols patent became a famous court case. His company, Moleculon, sued Ideal in 1982. The final ruling (1986) found that the 2×2×2 Pocket Cube infringed Nichols' patent but the 3×3×3 did not. In 2016, the EU's top court ruled that the cube's <i>shape</i> alone could not be protected as a trademark: the shape is how it works, not just how it looks.` },
      photo('nicholsPatent', 'Drawing from Larry Nichols\' 1972 patent: a 2×2×2 cube whose pieces are held together by magnets. Same idea of a twisty cube, different mechanism.'),
      { t: 'tip', kind: 'pro', html: `Why did the craze end in 1983? The puzzle was "done": almost everyone who wanted to had either solved it or given up, and the market was flooded with cheap copies. It took the internet (shared methods, then YouTube tutorials) and much better hardware to bring it back, this time as a sport.` },
      { t: 'quiz', q: 'What was the cube called when it first went on sale in Budapest?', options: ["Rubik's Cube", 'Magic Cube (Bűvös kocka)', 'Gordian Knot'], answer: 1, explain: `It was the Bűvös kocka, the "Magic Cube". Ideal renamed it Rubik's Cube for the 1980 world launch.` },
    ],
  },
  {
    id: 'mechanism',
    title: 'Inside the cube',
    kicker: 'Chapter 2 · Mechanism, colours and hardware',
    sections: [
      { t: 'p', html: `Take a cube apart (twist the top face 45°, then lever an edge out) and you find there is <b>no hidden sphere</b> and nothing clever in the corners. There is a <b>core</b> with six arms, a <b>centre cap</b> screwed to each arm, and twenty loose pieces that hold <i>each other</i> in.` },
      photo('disassembled', 'A cube taken apart. The six-armed core still carries its centres; each loose piece has a "foot" on the inside that rides in the groove under the layer around it.'),
      fig(mechanism(), 'The hidden structure. Each centre is fixed to the core by a screw and spring, so it can spin but never move. The edges\' feet trap the corners; the centres trap the edges.'),
      {
        t: 'list',
        items: [
          '<b>26 visible pieces</b> (6 centres, 12 edges, 8 corners), but only <b>21 parts</b> in the mechanism: the core with its 6 centres counts as one unit, plus 20 moving pieces.',
          '<b>The springs</b> set how tight the cube is. Tight = stable but slow; loose = fast but pops. Most speedcubes let you adjust tension with a screw or a dial.',
          '<b>The standard size</b> is about 5.6 cm per edge. Speedcubers tend to prefer 5.5–5.7 cm; smaller hands sometimes go smaller.',
          '<b>Centres cannot move relative to each other.</b> That one mechanical fact is why "the white side" means "wherever the white centre is".',
        ],
      },
      { t: 'h', text: 'The colour scheme' },
      { t: 'p', html: `Almost every cube sold today uses the <b>Western</b> (or "BOY") scheme: white opposite yellow, green opposite blue, red opposite orange. Hold the cube with a corner pointing at you and blue, orange and yellow run clockwise round that corner. Early cubes varied; a <b>Japanese</b> scheme puts blue opposite white instead. Opposite colours always differ most in brightness or hue, so you can tell them apart in a hurry.` },
      fig(schemes(), 'The scheme this app uses. Learn it cold: if you know the green centre is in front and white is on the bottom, you can find where any piece belongs without looking.'),
      { t: 'h', text: 'What makes a speedcube fast' },
      {
        t: 'list',
        items: [
          '<b>Corner cutting.</b> A face can still turn when the layer next to it is misaligned by up to ~45°. Old cubes locked up at a few degrees.',
          '<b>Reverse corner cutting.</b> The same, but when the turning face itself is ahead of the piece it meets.',
          '<b>Magnets.</b> Small magnets in each piece pull layers into alignment, so turns "click" into place and overshoots correct themselves. Standard since the late 2010s.',
          '<b>Maglev.</b> Some cubes replace the steel springs with opposing magnets for a smoother, quieter feel.',
          '<b>Lubricant.</b> Silicone lubes of different thickness ("weight") change speed and control. A drop or two is enough.',
          '<b>Stickerless.</b> Coloured plastic instead of stickers: nothing to peel. Many have a textured coating for grip.',
          '<b>Smart cubes.</b> Bluetooth sensors stream every turn to an app, so you can replay and analyse a solve move by move.',
        ],
      },
      { t: 'tip', html: 'Buying your first cube? Any recent <b>magnetic</b> 3×3 from a speedcube maker beats an old-style toy cube by a mile, and entry-level models are cheap. Avoid lubing a brand-new cube on day one; turn it in for a few hundred solves first.' },
      { t: 'tip', kind: 'warn', html: 'Never peel stickers to "solve" a cube: one moved sticker can make the puzzle literally unsolvable. If pieces pop out, put them back in the solved position (see Chapter 3 for why a random reassembly fails 11 times out of 12).' },
    ],
  },
  // ───────────────────────── Part II · The maths ─────────────────────────
  {
    id: 'pieces',
    part: 'The maths',
    title: 'Forget the stickers',
    kicker: 'Chapter 3 · What you are actually solving',
    sections: [
      { t: 'p', html: 'Here is the most useful sentence in this whole app: <b>you are not moving stickers, you are moving pieces.</b> Beginners stare at a face and try to make it one colour. Good solvers ignore the faces almost entirely and track a handful of plastic pieces. Once that clicks, everything else follows.' },
      fig(trio(), 'The 26 visible pieces. Centres never move relative to each other; that is why "the green side" is wherever the green centre is.'),
      { t: 'p', html: 'A corner can only ever be in a corner spot, an edge only in an edge spot. So a cube "state" is just: <b>where is every edge and corner, and which way is it twisted?</b> Count those and you get this monster:' },
      fig(bigNumber(), 'Forty-three quintillion. If every person on Earth checked one position per second, it would take about 170 years.'),
      { t: 'h', text: 'Why divide by 2? The cube keeps secrets' },
      { t: 'p', html: 'Pull a cube apart and put it back randomly and you get <b>12 times</b> more arrangements (519 quintillion). Only one in twelve can be solved, because three things can never change by turning:' },
      {
        t: 'list',
        items: [
          '<b>Corner twist adds up.</b> Give each corner a twist of 0, 1 or 2; the total is always a multiple of 3. You can never twist <i>one</i> corner on its own (×3).',
          '<b>Edge flips come in pairs.</b> The number of flipped edges is always even. One flipped edge = someone took the cube apart (×2).',
          '<b>Swaps come in pairs.</b> Every quarter turn swaps pieces in a way that keeps corner and edge "parity" in lockstep. You can never swap just two edges (×2).',
        ],
      },
      { t: 'tip', html: 'That is why every last-layer algorithm you will ever learn fixes things in groups: two edges flipped, three corners cycled, two pairs swapped. A single wrong piece means the cube was reassembled (or a sticker was peeled). Don\'t try to "solve" it: pop the piece and put it back.' },
      { t: 'h', text: 'The cube is a group' },
      { t: 'p', html: `Mathematicians love the cube because it is a perfect, hand-held example of a <b>group</b>: a set of actions you can combine (do one move sequence, then another), undo (every sequence has an inverse), and where doing nothing is allowed. The <i>Rubik's Cube group</i> is generated by just six quarter turns, U, D, L, R, F and B, and has exactly 43,252,003,274,489,856,000 elements, one for each reachable position.` },
      {
        t: 'list',
        items: [
          '<b>Order matters.</b> R then U is not the same as U then R. The group is <i>non-commutative</i>, which is the whole reason the puzzle is hard.',
          '<b>Every sequence has an order.</b> Repeat it enough and you return to solved (see Chapter 5).',
          '<b>The centres act as a frame.</b> If you also track how each centre is rotated (a "supercube", or a picture cube), there are 2,048 times more positions: 4<sup>6</sup> ÷ 2.',
          '<b>Small cousins.</b> The 2×2×2 has only 3,674,160 positions (7! × 3<sup>6</sup>) and is solvable in at most 11 moves.',
        ],
      },
      { t: 'quiz', q: 'You see exactly one edge flipped and everything else solved. What happened?', options: ['You need a long algorithm', 'The cube was reassembled wrongly', 'It is an OLL case'], answer: 1, explain: 'A single flipped edge breaks the edge-flip invariant: no sequence of turns can reach it.' },
    ],
  },
  {
    id: 'notation',
    title: 'Speaking cube',
    kicker: 'Chapter 4 · Notation, and how we count moves',
    sections: [
      { t: 'p', html: `The letters every cuber uses were introduced by mathematician <b>David Singmaster</b> in 1979, which is why it is called <b>Singmaster notation</b>. Each face has a letter: <b>U</b>p, <b>D</b>own, <b>L</b>eft, <b>R</b>ight, <b>F</b>ront, <b>B</b>ack. A plain letter means a clockwise quarter turn <i>as if you were looking straight at that face</i>.` },
      {
        t: 'table',
        head: ['Written', 'Meaning', 'Example'],
        rows: [
          ['<code class="alg">R</code>', 'Right face, clockwise quarter turn', 'Front-right stickers go up'],
          [`<code class="alg">R'</code>`, 'Prime: anticlockwise', 'Read "R prime"'],
          ['<code class="alg">R2</code>', 'Half turn (direction does not matter)', 'Same as R R'],
          ['<code class="alg">r</code> or <code class="alg">Rw</code>', 'Wide: the R face and the middle slice together', 'Common in OLL'],
          ['<code class="alg">M</code> <code class="alg">E</code> <code class="alg">S</code>', 'Middle slices: M turns like L, E like D, S like F', 'Roux lives on M'],
          ['<code class="alg">x</code> <code class="alg">y</code> <code class="alg">z</code>', 'Rotate the whole cube like R, U, F', 'No pieces move relative to each other'],
          ['<code class="alg">(R U R\' U\')3</code>', 'Repeat the bracket 3 times', 'Brackets also mark finger-trick chunks'],
          ['<code class="alg">[A, B]</code> / <code class="alg">[A: B]</code>', 'Commutator A B A\' B\' / conjugate A B A\'', 'See Chapter 5'],
        ],
      },
      { t: 'notation', moves: ['R', "R'", 'R2', 'U', "U'", 'F', 'L', 'D', 'B', 'M', 'E', 'S', 'r', 'x', 'y', 'z'] },
      { t: 'p', html: `"How many moves?" has <b>more than one honest answer</b>, depending on what you count:` },
      {
        t: 'list',
        items: [
          '<b>HTM</b> (half-turn metric): any face turn counts as 1, including R2. The standard for "God\'s number".',
          '<b>QTM</b> (quarter-turn metric): R2 counts as 2. Physically honest, and it makes everything look longer.',
          '<b>STM</b> (slice-turn metric): an M slice counts as 1 instead of 2 (R L\'). Roux solvers like this one, for obvious reasons.',
          '<b>ETM</b> (execution-turn metric): also counts cube rotations. The closest to "how long does it take my hands".',
        ],
      },
      { t: 'p', html: `Two tricks worth knowing by heart. The <b>inverse</b> of any algorithm is the same moves reversed, each one flipped: the inverse of ${alg("R U R' U'")} is ${alg("U R U' R'")}. The <b>mirror</b> swaps left and right: R becomes L', U becomes U'. Learn one algorithm, get its mirror for free.` },
      { t: 'quiz', q: `How many moves is ${alg('R2 U2 M2')} in HTM? (M counts as two layers in HTM)`, options: ['3', '4', '6'], answer: 1, explain: 'R2 = 1, U2 = 1, and M2 is really R2 L2 plus a rotation, so 2 in HTM. Total 4. In STM it would be 3.' },
    ],
  },
  {
    id: 'algorithms',
    title: 'Algorithms are tricks with side effects',
    kicker: 'Chapter 5 · Triggers, conjugates, commutators',
    sections: [
      { t: 'p', html: 'An algorithm is not magic. It is a short dance that <b>messes things up and puts most of them back</b>, leaving a small, useful change behind. Three ideas explain almost all of them.' },
      { t: 'h', text: '1. Triggers: the words of the language' },
      { t: 'p', html: `A trigger is a 3-4 move chunk your hands do without thinking. ${alg("R U R' U'")} (the "sexy move") and ${alg("R' F R F'")} (the "sledgehammer") are the two famous ones. Both have <b>order 6</b>: do either six times and the cube comes back to solved. Speedcubers read algorithms as strings of triggers, not letters.` },
      { t: 'h', text: '2. Conjugates: A B A\'' },
      { t: 'p', html: `Set up, do the thing, undo the setup. If you know how to fix a piece at the front-right, you can fix one anywhere: move it to the front-right (A), fix it (B), move back (A'). Written <b>[A: B]</b>. Every "turn the top so the corner is above its slot" in the beginner method is a conjugate.` },
      { t: 'h', text: '3. Commutators: A B A\' B\'' },
      { t: 'p', html: `This is the big one. If A messes up one area and B only touches one piece of that area, then A B A' B' changes <b>just a few pieces</b> and leaves everything else alone. Watch ${alg("R U R' D R U' R' D'")} (that is <b>[R U R', D]</b>): exactly three corners move. Nothing else on the cube changes.` },
      { t: 'cube', caption: 'A pure corner 3-cycle. Press Play and watch the bottom layer: everything else comes back.', play: "R U R' D R U' R' D'", mask: 'corners' },
      { t: 'tip', kind: 'pro', html: 'Blindfolded solvers and fewest-move solvers live on commutators: they let you build any 3-cycle you want on the spot, no memorisation required.' },
      { t: 'h', text: 'How long until it repeats?' },
      { t: 'p', html: `Repeat any sequence and the cube eventually returns to solved. ${alg('R U')} takes <b>105</b> repetitions. The record holder is ${alg("R U2 D' B D'")} with <b>1260</b>: no sequence on the 3x3 takes longer to cycle back.` },
      { t: 'h', text: 'Patterns: algorithms for fun' },
      { t: 'p', html: `Not every algorithm solves something. "Pretty patterns" are sequences that paint shapes on a solved cube. The simplest is the checkerboard, ${alg('M2 E2 S2')}. Every pattern below is real, generated live from its algorithm. Try them in the Playground, or attempt them as challenges in <a href="#/puzzles">Puzzles</a>.` },
      fig(patterns(), 'Four classic patterns. Six spots takes 8 moves, cube-in-a-cube 15, and the superflip needs the full 20 (Chapter 10).'),
      { t: 'quiz', q: 'Why does a commutator only change a few pieces?', options: ['Because it is short', 'Because A and B overlap on only a few pieces; everything else gets undone', 'Because it uses only R and U'], answer: 1, explain: "Pieces touched by only A, or only B, get exactly undone by A' or B'. Only the overlap ends up changed." },
    ],
  },
  // ───────────────────────── Part III · Solving ─────────────────────────
  {
    id: 'oll-pll',
    part: 'Solving',
    title: 'Two jobs: orient, then permute',
    kicker: 'Chapter 6 · Why the last layer splits into OLL and PLL',
    sections: [
      { t: 'p', html: 'After the first two layers, the last layer has two separate problems. <b>Orientation</b>: is the yellow sticker on top? <b>Permutation</b>: is each piece in the right spot? CFOP solves them in that order, one algorithm each.' },
      fig(ollVsPll(), 'Left: the Sune case, an orientation problem (grey = not yellow). Right: the T-perm, a pure permutation problem; the top is already all yellow.'),
      {
        t: 'list',
        items: [
          '<b>OLL: 57 cases.</b> Count every orientation pattern, merge ones that are the same after turning the top, and you get 58. Drop "already solved": 57.',
          '<b>PLL: 21 cases.</b> Same counting for positions gives 22, minus the solved one.',
          '<b>2-look</b> splits each into easy halves: orient edges then corners (10 algorithms), permute corners then edges (6 algorithms).',
        ],
      },
      { t: 'p', html: 'Doing both at once in a single algorithm is called <b>1LLL</b>, and it runs to thousands of cases. The popular slice of it is <b>ZBLL</b>: about 472 algorithms for when the edges are already oriented, and some top solvers really do learn them all. (The 2.51 s world record in October 2026 finished with a ZBLL.) Opinion: it is the last 0.5 seconds, not the first 10. Learn it last, if ever.' },
      {
        t: 'table',
        head: ['Last-layer system', 'Algorithms', 'Looks', 'Who uses it'],
        rows: [
          ['Beginner (this course)', '≈ 4-5', '4-6', 'Your first solves'],
          ['2-look OLL + 2-look PLL', '16', '4', 'Sub-30 to sub-20'],
          ['Full OLL + full PLL', '78', '2', 'The CFOP standard'],
          ['COLL + EPLL', '≈ 46', '2', 'When edges are oriented'],
          ['OLLCP / ZBLL', '≈ 330 / ≈ 472', '1-2', 'World-class solvers'],
          ['Full 1LLL', '≈ 3,900', '1', 'A handful of people'],
        ],
      },
    ],
  },
  {
    id: 'methods',
    title: 'Methods: a field guide',
    kicker: 'Chapter 7 · Same cube, very different philosophies',
    sections: [
      fig(methodsChart(), 'Average moves per solve. Fewer is not automatically faster; see the next chapter.'),
      {
        t: 'list',
        items: [
          '<b>Beginner (layer by layer).</b> The approach in most 1980s solution booklets: learnable in a weekend, never undoes your progress, wildly inefficient. Perfect first method, terrible last one.',
          '<b>CFOP (Fridrich).</b> Cross, F2L, OLL, PLL. Pieces of it were developed by several cubers in the early 1980s; Jessica Fridrich refined it and published it on her website in 1997, and the internet did the rest. The default for a reason: every step is easy to recognise, the algorithms flow on R and U, and you can look ahead.',
          '<b>Roux.</b> Invented by Gilles Roux around 2003. Build two 1×2×3 blocks, solve the last corners (CMLL), then finish with M slices and U turns. Low move count, few algorithms, almost no rotations. It feels like sculpting. The catch: fast M slices are a skill of their own.',
          '<b>ZZ.</b> Zbigniew Zborowski, 2006. Orient every edge first (EOLine); after that, only R, U and L are needed. Ergonomic and calm. Pairs nicely with ZBLL.',
          '<b>Petrus.</b> Lars Petrus, early 1980s. Grow a 2×2×2 block into 2×2×3, fix the edges, finish. A brilliant teacher of efficiency, rarely used for speed today.',
          '<b>Corners first.</b> Solve all eight corners, then the edges. Popular in the 1980s; still the best way to see the cube "from a different angle".',
          '<b>Fewest Moves (FMC).</b> Not a method, an event: one hour, pen and paper, find the shortest solution you can. Top humans regularly beat 25 moves; the record is 16.',
        ],
      },
      { t: 'h', text: 'CFOP add-ons you will hear about' },
      {
        t: 'list',
        items: [
          '<b>X-cross</b>: solve the cross and the first F2L pair together, planned in inspection. Top solvers plan double or even triple X-crosses.',
          '<b>Multi-slotting</b>: inserting one pair in a way that sets up the next.',
          '<b>Winter Variation / VLS</b>: insert the last pair and orient the last layer\'s corners at once.',
          '<b>COLL, ZBLL</b>: when edges are oriented, solve more of the last layer in one look.',
          '<b>Colour neutrality</b>: being happy to start on any of the six colours, so you always pick the easiest cross.',
        ],
      },
      { t: 'h', text: 'Blindfolded methods' },
      { t: 'p', html: `Blindfolded solving splits into <b>memorise</b> (inspect with eyes open, often turning the cube into letter pairs and words) and <b>execute</b> (blindfold on, solve from memory). Beginners use <b>Old Pochmann</b>: swap one piece at a time with a fixed "buffer" using a modified T-perm. Experts use <b>3-style</b>: a commutator for every pair of pieces, solving three pieces per algorithm.` },
      { t: 'tip', html: 'Try it: scramble in the Playground and look at the "On this cube" comparison. Beginner vs computer on the exact same position is a humbling sight.' },
    ],
  },
  {
    id: 'speed',
    title: 'Speed is not move count',
    kicker: 'Chapter 8 · TPS, lookahead and the pause problem',
    sections: [
      fig(`<div class="formula"><span>time</span> = <span class="frac"><span>moves</span><span>TPS</span></span> + <span>pauses</span></div>`, 'TPS = turns per second. Top solvers manage 10+ during a solve; beginners around 2-3.'),
      { t: 'p', html: 'A 55-move CFOP solve at 10 TPS with no pauses is 5.5 seconds. The same solve at 4 TPS with 8 one-second pauses is about 22 seconds. Notice which part dominates for most of us? <b>The pauses.</b> That is why the advice is always "slow down and look ahead" and never "turn faster".' },
      {
        t: 'list',
        items: [
          '<b>Lookahead</b>: while your hands finish one pair, your eyes find the next. Practise with slow, pause-free solves.',
          '<b>Recognition</b>: the moment between "what case is this?" and your hands moving. Trainers (like ours) attack this directly.',
          '<b>Ergonomics</b>: R and U moves are fast; B and D are slow. Good algorithms avoid them, which is why "fewest moves" and "fastest" disagree.',
          '<b>Finger tricks</b>: flick U with the index finger, push U\' with the left index, turn R with the wrist. No regrips means no lost time.',
          '<b>Inspection</b>: use all 15 seconds. Plan the whole cross, then track where the first pair\'s pieces will end up.',
        ],
      },
      { t: 'h', text: 'A realistic practice ladder' },
      {
        t: 'table',
        head: ['Average', 'What usually gets you there'],
        rows: [
          ['First solve', 'The beginner method. Learn it from the <a href="#/learn">Course</a>.'],
          ['≈ 1 min', 'Beginner method without notes, smoother turning.'],
          ['≈ 30 s', 'Intuitive F2L (pairs instead of corner-then-edge); 2-look OLL and PLL.'],
          ['≈ 20 s', 'Cross on the bottom, planned in inspection; full PLL; drill F2L cases.'],
          ['≈ 15 s', 'Full OLL, lookahead in F2L, finger tricks for every PLL.'],
          ['≈ 10 s', 'X-cross, efficient F2L, colour neutrality, lots of timed solves.'],
          ['Sub-7', 'Years of practice. Advanced last-layer systems. Talent helps.'],
        ],
      },
      { t: 'tip', kind: 'pro', html: 'Keep a log in the <a href="#/timer">Timer</a>, drill weak cases in the <a href="#/trainer">Trainer</a>, and do a few <a href="#/puzzles">Puzzles</a> each day. Short daily sessions beat weekend marathons.' },
    ],
  },
  // ───────────────────────── Part IV · Machines ─────────────────────────
  {
    id: 'computers',
    part: 'Machines',
    title: 'How computers solve it',
    kicker: "Chapter 9 · The two-phase trick and friends",
    sections: [
      { t: 'p', html: 'A computer cannot "see" the cube the way you do. It just has a state and 18 possible moves. The question is how to find a short path to solved without trying all 43 quintillion positions.' },
      {
        t: 'list',
        items: [
          '<b>Brute force</b> is hopeless: 18 possible moves, depth 20 → way too many paths.',
          '<b>Thistlethwaite (1981)</b> split solving into four stages, each allowing fewer kinds of moves. Max 52 moves. A human could almost follow it.',
          '<b>Kociemba (1992)</b> cut it to two stages. Phase 1 reaches the subgroup <b>G1</b> (all pieces oriented, middle-slice edges in their slice). Phase 2 solves using only U, D and half turns. Each phase is a small enough search to do instantly.',
          '<b>Korf (1997)</b> found truly optimal solutions with IDA* (iterative deepening + a lower-bound "heuristic" from huge pre-computed tables). Exact, but slow.',
        ],
      },
      fig(funnel(), "The two-phase funnel. G1 has 19,508,428,800 positions; there are 2,217,093,120 ways to be outside it. Both searches are small, so the computer finishes in milliseconds."),
      { t: 'p', html: `Why it works: phase 1 only has to fix <b>orientation and which slice the middle edges are in</b>, ignoring where every piece actually goes. That is "only" 2.2 billion cases, small enough for a lookup table that tells the search how far away it is. Phase 2 has the same luxury inside G1. Two small searches beat one giant one.` },
      { t: 'tip', kind: 'pro', html: 'Try it: Playground → <b>Fastest solution</b>. It runs min2phase (an optimised two-phase solver). When the answer splits cleanly, which happens on roughly half of scrambles, it shows where phase 1 ends and phase 2 begins: from there on you only see turns of one axis plus half turns. The other times, the solver found its answer from a rotated or inverted copy of the cube, and the phases are mixed together.' },
      { t: 'h', text: 'How this app\'s beginner solver works' },
      { t: 'p', html: `The Playground's guided solve does the opposite of Kociemba: it solves the way <i>you</i> would. For each stage (cross, corners, middle layer, last layer) it searches for the short sequence that places the next piece without breaking anything already done, then explains it. Longer, but every step has a visible goal.` },
      { t: 'quiz', q: 'Why don\'t humans use the two-phase method?', options: ['It is too long', 'The intermediate positions look random, so there is nothing to recognise', 'It only works on robots'], answer: 1, explain: 'Human methods are designed so every step has a visible goal. G1 has no visible goal; it just looks scrambled.' },
    ],
  },
  {
    id: 'gods-number',
    title: "God's number is 20",
    kicker: 'Chapter 10 · Thirty years of narrowing it down',
    sections: [
      { t: 'p', html: `"God's number" is the most moves any position needs if you always play perfectly. In 2010, <b>Tomas Rokicki, Herbert Kociemba, Morley Davidson and John Dethridge</b> proved it is <b>20</b> (half-turn metric). The proof split the cube into 2.2 billion sets of positions, used symmetry to cut that to about 56 million, and solved each set on Google's computers: around <b>35 CPU-years</b> of work, done in weeks.` },
      {
        t: 'table',
        head: ['Year', 'Upper bound', 'Who'],
        rows: [
          ['1979', '277', 'David Singmaster (his own method)'],
          ['1981', '52', 'Morwen Thistlethwaite'],
          ['1995', '29', 'Michael Reid'],
          ['2006', '27', 'Silviu Radu'],
          ['2007', '26', 'Daniel Kunkle & Gene Cooperman'],
          ['2008', '25 → 23 → 22', 'Tomas Rokicki'],
          ['2010', '<b>20</b>', 'Rokicki, Kociemba, Davidson & Dethridge'],
        ],
        caption: 'Upper bounds on God\'s number, half-turn metric.',
      },
      { t: 'p', html: `An upper bound alone is half the story: someone also needs a position that provably takes 20. In 1995 Michael Reid showed the <b>superflip</b> (every edge flipped in place, every corner solved) needs exactly 20 moves: ${alg("U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2")}.` },
      { t: 'cube', caption: 'The superflip: all 12 edges flipped, everything else solved. One of the hardest positions there is.', play: "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2" },
      fig(distanceChart(), 'How far is a random position from solved? Note the log scale: each grid line is 100,000× the one below. Most positions need 17 or 18 moves; distance 20 is about one in 90 billion. Distances 0-15 are exact counts, 16-20 estimates.'),
      {
        t: 'list',
        items: [
          '<b>Distance 4 has 43,239 positions, not 18<sup>4</sup>.</b> Many four-move sequences reach the same place (R L = L R, for example). This app\'s test suite recounts it.',
          '<b>In the quarter-turn metric</b> God\'s number is <b>26</b>, proved by Rokicki and Davidson in 2014.',
          '<b>Average</b>: a random position needs about 17.7 moves. Fewest Moves champions (record: 16) are flirting with perfection.',
        ],
      },
    ],
  },
  {
    id: 'robots',
    title: 'Robots and the 0.3-second solve',
    kicker: 'Chapter 11 · When the hands are motors',
    sections: [
      photo('rubot', 'RuBot II, a hobbyist humanoid robot, at Maker Faire UK in 2010. Cube robots range from LEGO builds to industrial machines.', 'right'),
      { t: 'p', html: `A cube robot needs three things: <b>eyes</b> (cameras read the colours), <b>a brain</b> (a two-phase solver, which finishes in milliseconds), and <b>hands</b> (usually six motors gripping the centres directly, so it never rotates the cube). The hands are the bottleneck.` },
      {
        t: 'timeline',
        items: [
          ['2011', '<b>CubeStormer II</b> (built from LEGO and smartphones) solves in about 5.3 s, faster than the human record at the time.'],
          ['2014', '<b>CubeStormer 3</b>: 3.253 s, a Guinness World Record.'],
          ['2016', '<b>Sub1 Reloaded</b> (Infineon chip demo): 0.637 s.'],
          ['2018', 'Students Ben Katz and Jared Di Carlo at MIT clock <b>0.38 s</b> with custom motors (not a Guinness-verified record).'],
          ['2019', 'OpenAI trains a robotic <b>hand</b> to solve a cube one-handed with reinforcement learning: slow, but a big step in dexterity.'],
          ['2024', `Mitsubishi Electric's <b>TOKUFASTbot</b> sets the Guinness record at <b>0.305 s</b>. Each quarter turn takes about 9 ms.`],
        ],
      },
      { t: 'p', html: `Fun comparison: 0.305 s is less than a human blink. The fastest human single (2.51 s) is about 8 times slower, and the humans have to look at the cube first: robots skip the 15-second inspection entirely.` },
    ],
  },
  // ───────────────────────── Part V · The sport ─────────────────────────
  {
    id: 'competitions',
    part: 'The sport',
    title: 'How competitions work',
    kicker: 'Chapter 12 · The WCA, events and rules',
    sections: [
      photo('tartu', 'A typical competition room (Tartu Open 2017, Estonia): solving stations with timers along the walls, scramblers and judges moving between them, spectators in front.'),
      { t: 'p', html: `Official speedcubing is run by the ${link(WCA, 'World Cube Association')} (WCA), a non-profit founded in 2004 after the 2003 World Championship in Toronto. It writes the regulations, approves competitions, sends trained <b>Delegates</b> to oversee them, and keeps every official result ever recorded. Over <b>245,000</b> people have competed, and more than a thousand competitions run every year, from school halls to arenas.` },
      { t: 'h', text: 'A solve, step by step' },
      {
        t: 'list',
        ordered: true,
        items: [
          '<b>Scrambling.</b> A volunteer scrambles your cube out of sight using an official computer-generated <b>random-state</b> scramble, so every position is equally likely.',
          '<b>Inspection.</b> The judge lifts the cover and starts a stopwatch. You have <b>15 seconds</b> to look (no turning). Start after 15 s and you get <b>+2 seconds</b>; after 17 s, the solve is a <b>DNF</b> (did not finish).',
          '<b>The timer.</b> Hands flat on a <b>StackMat</b> timer\'s pads; lift them and the clock starts. Solve, put the cube down, and slap the pads to stop it.',
          '<b>Judging.</b> If any face is off by more than 45°, it is a DNF; off by more than a small tolerance, +2. You and the judge both sign the score card.',
        ],
      },
      photo('stackmat', 'A StackMat timer, borrowed from the sport-stacking world. Both hands on the pads arms it; lifting them starts the clock.'),
      { t: 'h', text: 'Formats' },
      {
        t: 'list',
        items: [
          '<b>Average of 5 (ao5)</b>: most events. Drop the best and worst solve, average the middle three. This rewards consistency over one lucky solve.',
          '<b>Mean of 3</b>: 6×6, 7×7 and Fewest Moves, where solves are long.',
          '<b>Best of 3</b>: blindfolded events are ranked by the single best.',
          '<b>Rounds, cutoffs and time limits</b>: get under a cutoff in your first solves to finish the round; the fastest move on to the next round.',
          '<b>Records</b>: NR (national), CR (continental) and WR (world) are recognised for both single and average.',
        ],
      },
      { t: 'h', text: 'The 17 official events' },
      {
        t: 'table',
        head: ['Group', 'Events'],
        rows: [
          ['NxN cubes', '2×2×2, 3×3×3, 4×4×4, 5×5×5, 6×6×6, 7×7×7'],
          ['3×3 variations', 'One-Handed, Blindfolded, Multi-Blind, Fewest Moves'],
          ['Big blind', '4×4×4 Blindfolded, 5×5×5 Blindfolded'],
          ['Other puzzles', 'Clock, Megaminx, Pyraminx, Skewb, Square-1'],
          ['Retired', '3×3 With Feet (removed 2020), Rubik\'s Magic & Master Magic (2012), and a few others'],
        ],
        caption: 'Changes are planned: Clock is due to be dropped after the 2027 World Championship and the Face-Turning Octahedron added.',
      },
      photo('blindfolded', 'A blindfolded attempt in progress (French Championship 2024). The competitor memorised the cube, then put on the blindfold; the clock runs through both.'),
      photo('megaminx', 'Megaminx solvers at the 2011 Estonian Open. Twelve faces, but the methods are close cousins of 3×3 ones.'),
      { t: 'h', text: 'World Championships' },
      {
        t: 'table',
        head: ['Year', 'Host city', '3×3 champion', 'Winning result'],
        rows: [
          ['1982', 'Budapest', 'Minh Thai (USA)', '22.95 single'],
          ['2003', 'Toronto', 'Dan Knights (USA)', '20.00 average'],
          ['2005', 'Lake Buena Vista', 'Jean Pons (France)', '15.10'],
          ['2007', 'Budapest', 'Yu Nakajima (Japan)', '12.46'],
          ['2009', 'Düsseldorf', 'Breandan Vallance (UK)', '10.74'],
          ['2011', 'Bangkok', 'Michał Pleskowicz (Poland)', '8.65'],
          ['2013', 'Las Vegas', 'Feliks Zemdegs (Australia)', '8.18'],
          ['2015', 'São Paulo', 'Feliks Zemdegs (Australia)', '7.56'],
          ['2017', 'Paris', 'Max Park (USA)', '6.85'],
          ['2019', 'Melbourne', 'Philipp Weyer (Germany)', '6.74'],
          ['2021', 'Almere', 'Cancelled (pandemic)', '—'],
          ['2023', 'Incheon', 'Max Park (USA)', '5.31'],
          ['2025', 'Seattle', 'Yiheng Wang (China)', '4.23'],
          ['2027', 'Uppsala', 'to be decided', ''],
        ],
      },
      { t: 'tip', html: `Want to compete? Find one near you on the ${link(`${WCA}/competitions`, 'WCA competitions page')}. Everyone is welcome, the cutoffs for 3×3 are usually generous, and your first official average is a great motivator.` },
    ],
  },
  {
    id: 'records',
    title: 'Records',
    kicker: `Chapter 13 · The numbers, as of ${RECORDS_AS_OF}`,
    sections: [
      { t: 'facts', items: [['2.51 s', '3×3 single · Xuanyi Geng · Oct 2026'], ['3.51 s', '3×3 average · Yiheng Wang · Jun 2026'], ['16', 'fewest moves · Sebastiano Tronto · 2019'], ['63/65', 'multi-blind in under an hour · Graham Siggins · 2025']] },
      { t: 'p', html: `In 1982 the world's best took 22.95 seconds. The record then barely moved for two decades, because there were no competitions. Once the WCA arrived it fell fast: better methods (CFOP went mainstream), better cubes, and a generation who learned from video.` },
      fig(recordChart(), '3×3 single world record, 2003-2026 (milestones; some intermediate records are left out). Long flat stretches are years nobody could break it: Yusheng Du\'s 3.47 stood from late 2018 to mid-2023.'),
      {
        t: 'table',
        head: ['Event', 'Single', 'Holder', 'Average / mean', 'Holder'],
        rows: [
          ['3×3×3', '2.51', 'Xuanyi Geng (China)', '3.51', 'Yiheng Wang (China)'],
          ['2×2×2', '0.39', 'Ziyu Ye (China)', '0.86', 'Sujan Feist (USA)'],
          ['4×4×4', '15.18', 'Tymon Kolasiński (Poland)', '—', '—'],
          ['6×6×6', '57.69', 'Max Park (USA)', '—', '—'],
          ['3×3 One-Handed', '5.62', 'Patrick Ponce (USA)', '6.99', 'Zhen Chen (China)'],
          ['3×3 Blindfolded', '11.56', 'Tommy Cherry (USA)', '13.97', 'Tommy Cherry (USA)'],
          ['3×3 Fewest Moves', '16 moves', 'Sebastiano Tronto (Italy)', '19.00', 'Brian Johnson (USA)'],
          ['4×4 Blindfolded', '51.96', 'Stanley Chapel (USA)', '59.39', 'Stanley Chapel (USA)'],
          ['3×3 Multi-Blind', '63/65 in 58:23', 'Graham Siggins (USA)', '', ''],
          ['Megaminx', '21.04', 'Ziyu Wu (China)', '23.40', 'Timofei Tarasenko (Russia)'],
          ['Pyraminx', '0.73', 'Simon Kellum (USA)', '1.14', 'Lingkun Jiang (China)'],
          ['Skewb', '0.73', 'Vojtěch Grohmann (Czechia)', '1.37', 'Ignacy Samselski (Poland)'],
          ['Square-1', '2.85', 'Brian Johnson (USA)', '4.63', 'Sameer Aggarwal (USA)'],
          ['Clock', '1.53', 'Lachlan Gibson (New Zealand)', '2.14', 'Lachlan Gibson (New Zealand)'],
        ],
        caption: `Times in seconds. "—" means we could not confirm the holder from our sources; records fall every few weeks, so check the ${link(`${WCA}/results/records`, 'official WCA records page')} for the live list.`,
      },
      { t: 'h', text: 'Inside a world record' },
      { t: 'p', html: `Xuanyi Geng's 2.51 at the Guangzhou Grand Open in October 2026 was <b>about 32 moves</b> (slice-turn metric) at roughly <b>12-13 turns per second</b>. He planned a double X-cross in inspection, finished F2L in about 1.2 s, and ended with a ZBLL. Like most records it was a "lucky" scramble played perfectly: his other solves in that round were between 3.2 and 4.8 seconds. That is why the average record is the one many cubers respect most.` },
    ],
  },
  {
    id: 'cubers',
    title: 'People who shaped the sport',
    kicker: 'Chapter 14 · Champions, inventors and record-breakers',
    sections: [
      photo('feliks', 'Feliks Zemdegs at the Swisscubing Cup Final in 2018, the year he set 4.22.', 'right'),
      {
        t: 'list',
        items: [
          '<b>Minh Thai</b> (USA): a Vietnamese-American student who won the first World Championship in 1982 with 22.95 s.',
          '<b>Jessica Fridrich</b> (Czech Republic / USA): refined and published CFOP, the method most speedcubers still use. Off the cube, a professor at Binghamton University known for research in digital image forensics.',
          '<b>Lars Petrus, Gilles Roux, Zbigniew Zborowski</b>: method inventors whose names are now verbs in cuber slang.',
          '<b>Erik Akkersdijk</b> (Netherlands): his 7.08 from 2008 stood for over two years, an eternity in the 2000s.',
          '<b>Feliks Zemdegs</b> (Australia): the face of the 2010s. Broke the 3×3 single and average records again and again, World Champion in 2013 and 2015, and co-founded a popular tutorial site.',
          '<b>Max Park</b> (USA): diagnosed with autism as a toddler, he took up cubing to work on fine motor skills and became a two-time World Champion (2017, 2023), set 3.13 in 2023, and has dominated the big cubes. He and Feliks star in the Netflix documentary <i>The Speed Cubers</i> (2020).',
          '<b>Yusheng Du</b> (China): 3.47 in 2018, the record that refused to fall for four and a half years.',
          '<b>Tymon Kolasiński</b> (Poland): one of the great all-rounders; 4×4 record holder.',
          '<b>Yiheng Wang</b> (China): the first sub-4 average, World Champion 2025, and holder of the 3.51 average record.',
          '<b>Xuanyi Geng</b> (China): broke 3.13 with 3.05 in 2025, then set 2.51 in October 2026.',
          '<b>Teodor Zajder</b> (Poland): the first official sub-3 single, 2.76 in February 2026.',
          '<b>Tommy Cherry</b> (USA), <b>Graham Siggins</b> (USA), <b>Sebastiano Tronto</b> (Italy): blindfolded, multi-blind and fewest-moves specialists who show there is more than one way to be "the best".',
        ],
      },
      photo('maxPark', 'Max Park moments after a 5×5 world-record average. Big cubes reward stamina and lookahead even more than the 3×3.', 'left'),
      { t: 'p', html: `A pattern worth noticing: the record holders of the 2020s mostly started very young, learned from online video rather than books, used magnetic cubes from day one, and practised with timers and trainers that log everything. The tools in this app are the same kind of tools.` },
    ],
  },
  // ───────────────────────── Part VI · Beyond the 3x3 ─────────────────────────
  {
    id: 'family',
    part: 'Beyond the 3×3',
    title: 'The puzzle family',
    kicker: 'Chapter 15 · Bigger, smaller and stranger',
    sections: [
      photo('variants', 'NxN cubes from 2×2×2 to 7×7×7. Above 3×3, centres can move too, so you first build big centres and pair up edges, then solve it like a 3×3.'),
      {
        t: 'table',
        head: ['Puzzle', 'Origin', 'Positions', 'Notes'],
        rows: [
          ['2×2×2 Pocket Cube', '1970s-80s', '3,674,160', 'Corners only. God\'s number 11 (HTM).'],
          ['3×3×3', 'Rubik, 1974', '4.3 × 10<sup>19</sup>', 'The original.'],
          ["4×4×4 Rubik's Revenge", 'Péter Sebestény, 1981', '7.4 × 10<sup>45</sup>', 'No fixed centres; famous "parity" cases.'],
          ["5×5×5 Professor's Cube", 'Udo Krell, 1981', '2.8 × 10<sup>74</sup>', 'Fixed centres again; no parity on the last layer.'],
          ['6×6×6, 7×7×7', 'Panagiotis Verdes (V-Cube), 2008', 'astronomical', 'Big-cube events at competitions.'],
          ['Pyraminx', 'Uwe Mèffert, 1970s', '933,120 (×81 tips)', 'A tetrahedron; solved in 1-2 s by experts.'],
          ['Megaminx', 'early 1980s', '≈ 1.0 × 10<sup>68</sup>', 'A dodecahedron; solved like a big 3×3.'],
          ['Skewb', 'Tony Durham, 1982', '3,149,280', 'Turns around corners, not faces.'],
          ['Square-1', 'Hršel & Kopský, 1990', '—', 'Changes shape as you turn it.'],
          ["Rubik's Clock", 'Wiggs & Taylor, 1988', '—', 'Nine dials per side, linked by pins.'],
        ],
      },
      photo('platonic', 'One puzzle for each Platonic solid: tetrahedron, cube, octahedron, dodecahedron and icosahedron. If it has faces, someone has made it twist.'),
      { t: 'h', text: 'Parity on big cubes' },
      { t: 'p', html: `On a 4×4, the centres can be in any arrangement, so the "swaps come in pairs" rule from Chapter 3 seems to break: you can end up with what looks like <b>one flipped edge</b> (OLL parity) or <b>two swapped edges</b> (PLL parity). Nothing is broken; the edge "pieces" you see are really pairs of separate pieces, and the invariant applies to those. You just need a special algorithm.` },
      photo('big13', 'A 13×13×13. The largest commercially made cubes run to 21×21 and beyond; custom builds have reached 33×33 (Grégoire Pfennig, 2017) and 49×49 (2024).', 'right'),
      {
        t: 'list',
        items: [
          '<b>Shape mods</b> (Mirror Cube, Ghost Cube, Axis Cube): a 3×3 mechanism in a different shape. Pieces are told apart by size, not colour.',
          '<b>Bandaged cubes</b>: some pieces are glued together, so some moves are blocked.',
          "<b>Rubik's Snake, Rubik's Magic</b>: Rubik's other inventions; not cubes, but twisty in spirit.",
          '<b>Digital cubes</b>: simulators go up to 100×100 and beyond, and to four dimensions (the "hypercube").',
        ],
      },
    ],
  },
  {
    id: 'culture',
    title: 'Culture and trivia',
    kicker: 'Chapter 16 · Odd facts, myths and pop culture',
    sections: [
      { t: 'facts', items: [['≈ 500 M', 'cubes sold (2024)'], ['1 month', 'for Rubik to solve his own cube'], ['1 in 12', 'random reassemblies are solvable'], ['0.305 s', 'robot record (2024)']] },
      photo('expo82', 'The giant cube built for Hungary\'s pavilion at the 1982 World\'s Fair in Knoxville, Tennessee, photographed in 2022.', 'right'),
      {
        t: 'list',
        items: [
          '<b>Museum piece.</b> The cube was shown at New York\'s Museum of Modern Art in 1981, and is in the collections of design museums around the world.',
          '<b>Saturday mornings.</b> <i>Rubik, the Amazing Cube</i> (1983) was an American cartoon about a magical talking cube.',
          '<b>On screen.</b> Will Smith\'s character solves one in a taxi in <i>The Pursuit of Happyness</i> (2006) to impress a future boss. Netflix\'s <i>The Speed Cubers</i> (2020) follows Feliks Zemdegs and Max Park.',
          '<b>Art.</b> The street artist Invader built "Rubikcubism" portraits out of hundreds of cubes (exhibited in 2005); cube mosaics remain a popular art form.',
          '<b>Google Doodle.</b> On 19 May 2014, Google\'s homepage became a playable cube for the 40th anniversary.',
          '<b>The author.</b> Ernő Rubik rarely gives interviews; his book <i>Cubed: The Puzzle of Us All</i> came out in 2020.',
          '<b>Feet!</b> Solving with your feet was an official WCA event until 2020.',
        ],
      },
      { t: 'h', text: 'Myths, busted' },
      {
        t: 'list',
        items: [
          '<b>"You need to be a genius."</b> The beginner method is about 7 short algorithms. Children solve it every day.',
          '<b>"There is a trick to make every solve the same."</b> Methods are fixed; positions are not. You recognise cases and react.',
          '<b>"Fast solvers memorise the scramble."</b> Not for normal solves. They plan the first step in inspection and look ahead during the solve. (Blindfolded solvers do memorise the whole cube.)',
          '<b>"Peeling stickers is cheating but works."</b> Usually it makes an unsolvable cube, and the next solver will hate you.',
          '<b>"Computers try every position."</b> They could not in a lifetime: Chapter 9 explains how they cheat cleverly instead.',
        ],
      },
    ],
  },
  // ───────────────────────── Appendix ─────────────────────────
  {
    id: 'glossary',
    part: 'Appendix',
    title: 'Glossary',
    kicker: 'Chapter 17 · Words cubers throw around',
    sections: [
      {
        t: 'list',
        items: [
          '<b>1LLL</b>: one-look last layer, the whole last layer in one algorithm.',
          '<b>Algorithm (alg)</b>: a fixed move sequence with a known effect.',
          '<b>AUF</b>: Adjust U Face, a final U turn to line things up.',
          '<b>ao5 / ao12</b>: average of 5 / 12, dropping the best and worst.',
          '<b>Bar</b>: three matching stickers on one side of the last layer.',
          '<b>BLD / MBLD</b>: blindfolded / multi-blind.',
          '<b>Block</b>: a group of solved pieces stuck together (1x2x2, 2x2x3…).',
          '<b>Buffer</b>: in blindfolded solving, the spot pieces are cycled through.',
          '<b>CFOP</b>: Cross, F2L, OLL, PLL. The Fridrich method.',
          '<b>CMLL / COLL</b>: solve last-layer corners in one go (Roux / CFOP).',
          '<b>CN</b>: colour neutral, able to start on any colour.',
          '<b>Commutator</b>: A B A\' B\'. Changes only where A and B overlap.',
          '<b>Conjugate</b>: A B A\'. Set up, do, undo the setup.',
          '<b>Corner cutting</b>: a cube\'s ability to turn while a layer is misaligned.',
          '<b>Cross</b>: the first step of CFOP, four edges around one centre.',
          '<b>Delegate</b>: the WCA official responsible for a competition.',
          '<b>DNF</b>: did not finish. Also "+2", the penalty for a nearly solved cube.',
          '<b>EO / CO / EP / CP</b>: edge or corner orientation / permutation.',
          '<b>F2L</b>: first two layers, solved in four corner-edge pairs.',
          '<b>FMC</b>: fewest moves challenge, one hour with pen and paper.',
          '<b>G1</b>: Kociemba\'s halfway subgroup (oriented, slice in place).',
          '<b>God\'s number</b>: 20. The most moves any position needs (HTM).',
          '<b>Headlights</b>: two matching corner stickers on one side.',
          '<b>HTM / QTM / STM</b>: ways of counting moves (half turn, quarter turn, slice turn).',
          '<b>Inspection</b>: the 15 seconds you get to look before solving.',
          '<b>Keyhole</b>: using an empty slot to insert a single piece.',
          '<b>LL / LSE</b>: last layer / last six edges (Roux).',
          '<b>Lookahead</b>: planning the next step while doing the current one.',
          '<b>Lube</b>: silicone lubricant that changes how a cube feels.',
          '<b>Maglev</b>: magnets instead of springs in the core.',
          '<b>NR / CR / WR</b>: national / continental / world record.',
          '<b>OH</b>: one-handed.',
          '<b>OLL / PLL</b>: orient / permute the last layer.',
          '<b>Pair</b>: a corner and edge joined together, ready to insert.',
          '<b>Parity</b>: an invariant; on the 3x3 it means swaps come in pairs.',
          '<b>Random-state scramble</b>: a scramble chosen so every position is equally likely.',
          '<b>Sexy move</b>: R U R\' U\'. Sledgehammer: R\' F R F\'.',
          '<b>Skip</b>: a lucky step that is already solved (an "OLL skip").',
          '<b>Slot</b>: one of the four F2L positions (front-right, etc.).',
          '<b>StackMat</b>: the official competition timer.',
          '<b>Sune</b>: R U R\' U R U2 R\', the most famous OLL.',
          '<b>Superflip</b>: every edge flipped in place; needs 20 moves.',
          '<b>TPS</b>: turns per second.',
          '<b>WCA</b>: World Cube Association, the sport\'s governing body.',
          '<b>X-cross</b>: cross plus the first F2L pair, together.',
          '<b>ZBLL</b>: the whole last layer in one algorithm (edges pre-oriented).',
        ],
      },
    ],
  },
  {
    id: 'sources',
    title: 'Sources and further reading',
    kicker: 'Chapter 18 · Where these facts come from',
    sections: [
      { t: 'p', html: `The mathematics in this guide is checked by the app's own test suite. History, records and biographies come from the sources below; records were last checked in ${RECORDS_AS_OF}.` },
      {
        t: 'list',
        items: [
          `${link(`${WCA}/results/records`, 'WCA official records')} and ${link(`${WCA}/regulations/`, 'WCA regulations')}: the authority on results and rules.`,
          `${link('https://cube20.org/', 'cube20.org')}: the God's number proof, distance counts and the QTM result.`,
          `${link('https://en.wikipedia.org/wiki/Rubik%27s_Cube', "Wikipedia: Rubik's Cube")}, ${link('https://en.wikipedia.org/wiki/Speedcubing', 'Speedcubing')}, ${link('https://en.wikipedia.org/wiki/Optimal_solutions_for_the_Rubik%27s_Cube', 'Optimal solutions')} and ${link('https://en.wikipedia.org/wiki/List_of_world_records_in_speedcubing', 'List of world records')}.`,
          `${link('https://kociemba.org/cube.htm', "Herbert Kociemba's site")}: the two-phase algorithm, explained by its author.`,
          `${link('https://www.jaapsch.net/puzzles/', "Jaap's Puzzle Page")}: mechanisms, maths and solutions for hundreds of twisty puzzles.`,
          `${link('https://www.speedsolving.com/wiki/', 'SpeedSolving wiki')}: methods, algorithm sets and cubing history.`,
          `${link('https://ruwix.com/', 'Ruwix')}: record news and record-progression history.`,
          'Photos: Wikimedia Commons contributors, credited under each photo with its licence.',
        ],
      },
    ],
  },
];
