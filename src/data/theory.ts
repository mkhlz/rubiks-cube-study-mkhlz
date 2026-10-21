/**
 * Theory: the "why" behind the cube, written to be read for fun.
 * Every number here is checked in tests/theory.test.ts (engine-verified
 * move orders and piece counts, arithmetic for state counts).
 */
import type { Section } from './curriculum';
import { applyAlg, invertAlg, solvedState } from '../cube/engine';
import { isoDiagram, llDiagram } from '../cube/diagram';
import { MASKS } from '../cube/masks';

export interface Chapter {
  id: string;
  title: string;
  kicker: string;
  sections: Section[];
}

const alg = (s: string) => `<code class="alg">${s}</code>`;
const caseOf = (a: string) => applyAlg(solvedState(), invertAlg(a));

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

export const CHAPTERS: Chapter[] = [
  {
    id: 'pieces',
    title: 'Forget the stickers',
    kicker: 'Chapter 1 · What you are actually solving',
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
      { t: 'quiz', q: 'You see exactly one edge flipped and everything else solved. What happened?', options: ['You need a long algorithm', 'The cube was reassembled wrongly', 'It is an OLL case'], answer: 1, explain: 'A single flipped edge breaks the edge-flip invariant: no sequence of turns can reach it.' },
    ],
  },
  {
    id: 'notation',
    title: 'Speaking cube',
    kicker: 'Chapter 2 · Notation, and how we count moves',
    sections: [
      { t: 'p', html: `You already know ${alg('R')}, ${alg("R'")} and ${alg('R2')}. The fun part is that "how many moves?" has <b>more than one honest answer</b>, depending on what you count:` },
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
    kicker: 'Chapter 3 · Triggers, conjugates, commutators',
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
      { t: 'quiz', q: 'Why does a commutator only change a few pieces?', options: ['Because it is short', 'Because A and B overlap on only a few pieces; everything else gets undone', 'Because it uses only R and U'], answer: 1, explain: "Pieces touched by only A, or only B, get exactly undone by A' or B'. Only the overlap ends up changed." },
    ],
  },
  {
    id: 'oll-pll',
    title: 'Two jobs: orient, then permute',
    kicker: 'Chapter 4 · Why the last layer splits into OLL and PLL',
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
      { t: 'p', html: 'Doing both at once in a single algorithm is called <b>1LLL</b>, and it runs to thousands of cases. The popular slice of it is <b>ZBLL</b>: about 472 algorithms for when the edges are already oriented, and some top solvers really do learn them all. Opinion: it is the last 0.5 seconds, not the first 10. Learn it last, if ever.' },
    ],
  },
  {
    id: 'methods',
    title: 'Methods: a field guide',
    kicker: 'Chapter 5 · Same cube, very different philosophies',
    sections: [
      fig(methodsChart(), 'Average moves per solve. Fewer is not automatically faster; see the next chapter.'),
      {
        t: 'list',
        items: [
          '<b>Beginner (layer by layer).</b> Learnable in a weekend, never undoes your progress, wildly inefficient. Perfect first method, terrible last one.',
          '<b>CFOP (Fridrich).</b> The default for a reason: every step is easy to recognise, the algorithms flow on R and U, and you can look ahead. Many algorithms, but you learn them gradually.',
          '<b>Roux.</b> Build two 1x2x3 blocks, then finish with M slices. Low move count, few algorithms, almost no rotations. It feels like sculpting. The catch: fast M slices are a skill of their own.',
          '<b>ZZ.</b> Orient every edge first; after that, only R, U and L are needed. Ergonomic and calm. Pairs nicely with ZBLL.',
          '<b>Petrus.</b> Grow a block, then extend it. Brilliant teacher of efficiency, rarely used for speed today.',
          '<b>Fewest Moves (FMC).</b> Not a method, an event: one hour, pen and paper, find the shortest solution you can. Top humans get close to the computer.',
        ],
      },
      { t: 'tip', html: 'Try it: scramble in the Playground and look at the "On this cube" comparison. Beginner vs computer on the exact same position is a humbling sight.' },
    ],
  },
  {
    id: 'computers',
    title: 'How computers solve it',
    kicker: "Chapter 6 · God's number and the two-phase trick",
    sections: [
      { t: 'p', html: 'In 2010 a team (Rokicki, Kociemba, Davidson and Dethridge) used about 35 CPU-years of Google\'s machines to prove that <b>every position can be solved in 20 moves or fewer</b> (HTM). They called it <b>God\'s number</b>. In the quarter-turn metric it is 26 (proved in 2014). Most positions need 17 or 18.' },
      { t: 'p', html: `The proof needed at least one position that truly takes 20. The famous one is the <b>superflip</b>: every edge flipped in place, every corner solved. Shown in 1995 to need exactly 20 moves: ${alg("U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2")}.` },
      { t: 'cube', caption: 'The superflip: all 12 edges flipped, everything else solved. One of the hardest positions there is.', play: "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2" },
      { t: 'h', text: 'Searching 43 quintillion positions (without searching them)' },
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
      { t: 'tip', kind: 'pro', html: 'Try it: Playground → <b>Fastest solution</b>. It runs min2phase (an optimised two-phase solver). When the answer splits cleanly, which happens on roughly half of scrambles, it shows where phase 1 ends and phase 2 begins: from there on you only see turns of one axis plus half turns. The other times, the solver found its answer from a rotated or inverted copy of the cube, and the phases are mixed together.' },
      { t: 'quiz', q: 'Why don\'t humans use the two-phase method?', options: ['It is too long', 'The intermediate positions look random, so there is nothing to recognise', 'It only works on robots'], answer: 1, explain: 'Human methods are designed so every step has a visible goal. G1 has no visible goal; it just looks scrambled.' },
    ],
  },
  {
    id: 'speed',
    title: 'Speed is not move count',
    kicker: 'Chapter 7 · TPS, lookahead and the pause problem',
    sections: [
      fig(`<div class="formula"><span>time</span> = <span class="frac"><span>moves</span><span>TPS</span></span> + <span>pauses</span></div>`, 'TPS = turns per second. Top solvers manage 10+ during a solve; beginners around 2-3.'),
      { t: 'p', html: 'A 55-move CFOP solve at 10 TPS with no pauses is 5.5 seconds. The same solve at 4 TPS with 8 one-second pauses is about 22 seconds. Notice which part dominates for most of us? <b>The pauses.</b> That is why the advice is always "slow down and look ahead" and never "turn faster".' },
      {
        t: 'list',
        items: [
          '<b>Lookahead</b>: while your hands finish one pair, your eyes find the next. Practise with slow, pause-free solves.',
          '<b>Recognition</b>: the moment between "what case is this?" and your hands moving. Trainers (like ours) attack this directly.',
          '<b>Ergonomics</b>: R and U moves are fast; B and D are slow. Good algorithms avoid them, which is why "fewest moves" and "fastest" disagree.',
        ],
      },
    ],
  },
  {
    id: 'glossary',
    title: 'Glossary',
    kicker: 'Chapter 8 · Words cubers throw around',
    sections: [
      {
        t: 'list',
        items: [
          '<b>Algorithm (alg)</b>: a fixed move sequence with a known effect.',
          '<b>AUF</b>: Adjust U Face, a final U turn to line things up.',
          '<b>ao5 / ao12</b>: average of 5 / 12, dropping the best and worst.',
          '<b>Bar</b>: three matching stickers on one side of the last layer.',
          '<b>Block</b>: a group of solved pieces stuck together (1x2x2, 2x2x3…).',
          '<b>CFOP</b>: Cross, F2L, OLL, PLL. The Fridrich method.',
          '<b>CMLL / COLL</b>: solve last-layer corners in one go (Roux / CFOP).',
          '<b>CN</b>: colour neutral, able to start on any colour.',
          '<b>Commutator</b>: A B A\' B\'. Changes only where A and B overlap.',
          '<b>Conjugate</b>: A B A\'. Set up, do, undo the setup.',
          '<b>Cross</b>: the first step of CFOP, four edges around one centre.',
          '<b>DNF</b>: did not finish. Also "+2", the penalty for a nearly solved cube.',
          '<b>EO / CO / EP / CP</b>: edge or corner orientation / permutation.',
          '<b>F2L</b>: first two layers, solved in four corner-edge pairs.',
          '<b>G1</b>: Kociemba\'s halfway subgroup (oriented, slice in place).',
          '<b>God\'s number</b>: 20. The most moves any position needs (HTM).',
          '<b>Headlights</b>: two matching corner stickers on one side.',
          '<b>HTM / QTM / STM</b>: ways of counting moves (half turn, quarter turn, slice turn).',
          '<b>Inspection</b>: the 15 seconds you get to look before solving.',
          '<b>Keyhole</b>: using an empty slot to insert a single piece.',
          '<b>LL / LSE</b>: last layer / last six edges (Roux).',
          '<b>Lookahead</b>: planning the next step while doing the current one.',
          '<b>OLL / PLL</b>: orient / permute the last layer.',
          '<b>Pair</b>: a corner and edge joined together, ready to insert.',
          '<b>Parity</b>: an invariant; on the 3x3 it means swaps come in pairs.',
          '<b>Sexy move</b>: R U R\' U\'. Sledgehammer: R\' F R F\'.',
          '<b>Skip</b>: a lucky step that is already solved (an "OLL skip").',
          '<b>Slot</b>: one of the four F2L positions (front-right, etc.).',
          '<b>Sune</b>: R U R\' U R U2 R\', the most famous OLL.',
          '<b>Superflip</b>: every edge flipped in place; needs 20 moves.',
          '<b>TPS</b>: turns per second.',
          '<b>X-cross</b>: cross plus the first F2L pair, together.',
          '<b>ZBLL</b>: the whole last layer in one algorithm (edges pre-oriented).',
        ],
      },
    ],
  },
];
