/**
 * The course. Tracks run from absolute zero to advanced speedcubing.
 * Cube sections are interactive: `setup` is applied to a solved cube
 * (or `caseOf` shows the case an algorithm solves), and `play` is the
 * sequence the learner can step through.
 */

export type Section =
  | { t: 'p'; html: string }
  | { t: 'h'; text: string }
  | { t: 'list'; items: string[]; ordered?: boolean }
  | { t: 'tip'; html: string; kind?: 'tip' | 'warn' | 'pro' }
  | {
      t: 'cube';
      caption: string;
      setup?: string;
      caseOf?: string;
      play?: string;
      mask?: string;
    }
  | { t: 'notation'; moves: string[] }
  | { t: 'algs'; keys: string[] }
  | { t: 'quiz'; q: string; options: string[]; answer: number; explain: string }
  | { t: 'figure'; html: string; caption: string }
  | { t: 'photo'; photo: Photo; caption: string; float?: 'left' | 'right'; wide?: boolean }
  | { t: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { t: 'timeline'; items: [string, string][] }
  | { t: 'facts'; items: [string, string][] };

/** A self-hosted photo from Wikimedia Commons, with the credit its licence requires. */
export interface Photo {
  file: string;
  w: number;
  h: number;
  alt: string;
  author: string;
  license: string;
  source: string;
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  sections: Section[];
}

export interface Track {
  id: string;
  title: string;
  level: string;
  goal: string;
  color: string;
  lessons: Lesson[];
}

const alg = (s: string) => `<code class="alg">${s}</code>`;

export const TRACKS: Track[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    level: 'Level 0 · Absolute beginner',
    goal: 'Understand the puzzle and read move notation.',
    color: '#7c5cff',
    lessons: [
      {
        id: 'f-anatomy',
        title: 'Meet the cube',
        minutes: 6,
        summary: 'Centres, edges and corners: the three kinds of pieces and why that matters.',
        sections: [
          { t: 'p', html: 'A 3x3 Rubik\'s Cube looks like 54 coloured stickers, but it is really <b>26 plastic pieces</b> held on a core. Solving gets far easier the moment you stop thinking about stickers and start thinking about <b>pieces</b>.' },
          { t: 'h', text: 'Three kinds of piece' },
          {
            t: 'list',
            items: [
              '<b>Centres (6)</b> have one sticker. They never move relative to each other, so <b>the centre decides the colour of its face</b>. The green centre means "this is the green side".',
              '<b>Edges (12)</b> have two stickers and sit between two centres.',
              '<b>Corners (8)</b> have three stickers and sit where three faces meet.',
            ],
          },
          { t: 'cube', caption: 'Only the centres are coloured. Drag the background to look around; notice yellow is opposite white, green opposite blue, red opposite orange.', mask: 'centers' },
          { t: 'cube', caption: 'Now only edges (and centres). Each edge has exactly two colours. There is exactly one white-green edge on the whole cube.', mask: 'edges' },
          { t: 'cube', caption: 'Corners have three colours each. The white-green-orange corner can only ever live where the white, green and orange faces meet.', mask: 'corners' },
          { t: 'tip', html: 'Because edges stay edges and corners stay corners, a "solved cube" just means: <b>every piece is in its home spot, turned the right way round</b>. Every method you will learn is a plan for doing that a few pieces at a time.' },
          { t: 'h', text: 'Colour scheme used in this course' },
          { t: 'p', html: 'We hold the cube with <b>yellow on top</b> and <b>green in front</b>. Then orange is on the right, red on the left, blue at the back and white on the bottom. This is the standard "Western" colour scheme and the orientation almost every CFOP tutorial uses.' },
          { t: 'quiz', q: 'How many stickers does an edge piece have?', options: ['1', '2', '3'], answer: 1, explain: 'Edges have two stickers, corners three, centres one.' },
          { t: 'quiz', q: 'You turn the right face. Which pieces can never move?', options: ['Corners', 'Centres (relative to each other)', 'Edges'], answer: 1, explain: 'Centres only spin in place, so they define each face\'s colour.' },
        ],
      },
      {
        id: 'f-notation',
        title: 'Move notation',
        minutes: 12,
        summary: 'R, U, F, primes, doubles, slices, wide moves and rotations, with a live cube for each.',
        sections: [
          { t: 'p', html: 'Every algorithm in cubing is written in <b>Singmaster notation</b>. Each letter is a face, and a plain letter means turn that face <b>90° clockwise as if you were looking straight at it</b>.' },
          { t: 'list', items: ['<b>R</b> right · <b>L</b> left · <b>U</b> up (top) · <b>D</b> down (bottom) · <b>F</b> front · <b>B</b> back', `A prime (${alg("R'")}) means counter-clockwise.`, `A 2 (${alg('R2')}) means turn it twice (180°). Direction does not matter for a half turn.`] },
          { t: 'notation', moves: ['R', "R'", 'U', "U'", 'F', "F'", 'L', "L'", 'D', "D'", 'B', "B'", 'R2', 'U2'] },
          { t: 'tip', html: 'The trap everyone falls into: <b>L is clockwise when you look at the left face</b>, so from the front it turns the opposite way to R. Same for D vs U, and B vs F. Use the buttons above until R and L\' feel like "the same direction".' },
          { t: 'h', text: 'Slice moves' },
          { t: 'p', html: `${alg('M')} turns the middle layer between L and R, in the same direction as L. ${alg('E')} is the layer between U and D (same direction as D), and ${alg('S')} the layer between F and B (same direction as F).` },
          { t: 'notation', moves: ['M', "M'", 'E', 'S', 'M2'] },
          { t: 'h', text: 'Wide moves' },
          { t: 'p', html: `A lowercase letter (or a "w") turns two layers together: ${alg('r')} = ${alg('Rw')} = the R face plus the middle slice. Wide moves show up in many OLL algorithms.` },
          { t: 'notation', moves: ['r', "r'", 'u', 'f', 'l'] },
          { t: 'h', text: 'Cube rotations' },
          { t: 'p', html: `${alg('x')}, ${alg('y')} and ${alg('z')} rotate the whole cube: x follows R, y follows U, z follows F. Nothing gets scrambled; you just look at it from a different side.` },
          { t: 'notation', moves: ['x', "x'", 'y', "y'", 'z'] },
          { t: 'quiz', q: `What is the inverse (undo) of ${alg("R U R' U'")}?`, options: [alg("U R U' R'"), alg("R' U' R U"), alg("U' R' U R")], answer: 0, explain: 'To undo, reverse the order and flip every direction: U R U\' R\'.' },
          { t: 'quiz', q: `${alg('U2')} and ${alg("U2'")} ...`, options: ['are different moves', 'end in the same position', 'cancel each other out completely only if done slowly'], answer: 1, explain: 'A half turn ends in the same place either way; the prime only hints which direction is easier for your fingers.' },
        ],
      },
      {
        id: 'f-handling',
        title: 'Holding and turning',
        minutes: 6,
        summary: 'Grip, home position and the first finger tricks, so good habits start on day one.',
        sections: [
          { t: 'p', html: 'You will repeat a few motions thousands of times, so it pays to learn them properly now.' },
          { t: 'list', items: ['Hold the cube with thumbs on the front face and fingers on the back, around the middle layer. This is the <b>home grip</b>.', 'Turn <b>R and R\'</b> with your right wrist, not your fingers.', 'Turn <b>U</b> by pushing the back-right of the top layer with your right index finger. Turn <b>U\'</b> with your left index finger.', 'Turn <b>F</b> with your right thumb or index finger; no need to re-grip.'] },
          { t: 'cube', caption: `Practice the "sexy move" ${alg("R U R' U'")}. Do it six times in a row and the cube returns to solved, a great warm-up.`, play: "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'" },
          { t: 'tip', html: 'Aim for smooth, not fast. Fast comes from never pausing, not from snapping turns. A loose, lubricated "speedcube" also makes a big difference: a magnetic beginner speedcube costs less than a pizza.' },
          { t: 'quiz', q: 'How many times must you repeat R U R\' U\' to get back to solved?', options: ['4', '6', '12'], answer: 1, explain: 'The sexy move has order 6.' },
        ],
      },
    ],
  },
  {
    id: 'beginner',
    title: 'Beginner method',
    level: 'Level 1 · First solve',
    goal: 'Solve the cube by yourself using 7 steps (layer by layer).',
    color: '#22c55e',
    lessons: [
      {
        id: 'b-overview',
        title: 'The plan: layer by layer',
        minutes: 4,
        summary: 'The 7 steps of the beginner method and why they work.',
        sections: [
          { t: 'p', html: 'The beginner method solves the cube one layer at a time: the white layer, then the middle layer, then the yellow layer. Each step uses either intuition or one short algorithm, and nothing you do later breaks what you already solved.' },
          { t: 'list', ordered: true, items: ['White cross (the daisy trick)', 'White corners → first layer done', 'Middle-layer edges → two layers done', 'Yellow cross on top', 'Yellow face (all yellow on top)', 'Position the yellow corners', 'Position the yellow edges → solved!'] },
          { t: 'cube', caption: 'Where we are heading. Grey pieces are not solved yet: after step 3 the first two layers (F2L) are done.', mask: 'f2l' },
          { t: 'tip', html: 'An <b>algorithm</b> ("alg") is just a fixed sequence of moves that does one job, like "swap these two corners". You only need <b>seven</b> to solve the whole cube.' },
        ],
      },
      {
        id: 'b-cross',
        title: 'Step 1 · The white cross',
        minutes: 10,
        summary: 'Build a daisy around the yellow centre, then flip each white edge down onto its centre.',
        sections: [
          { t: 'p', html: 'Goal: the four white edges on the bottom, each matching the centre beside it. The easiest way for a first-timer is the <b>daisy</b>.' },
          { t: 'h', text: '1a. Make a daisy' },
          { t: 'p', html: 'Hold the cube with yellow on top. Find a white edge and bring it up so its white sticker points up next to the yellow centre. Repeat for all four white edges, so you get four white "petals" around the yellow centre. If a spot is taken, turn U to move the existing petal out of the way first.' },
          { t: 'tip', html: 'Making the daisy is pure intuition: you can always bring an edge up without disturbing petals by first turning U so the empty spot is above it.' },
          { t: 'h', text: '1b. Send the petals down' },
          { t: 'p', html: `Look at a petal\'s <b>side</b> sticker. Turn ${alg('U')} until it sits above the centre of the same colour, then turn that face twice (e.g. ${alg('F2')}). The edge drops to the bottom with white facing down. Do this for all four.` },
          { t: 'cube', caption: 'A daisy (white edges around yellow). Press Play to watch: match the side colour, then turn that face twice. Turn it over afterwards (drag the background) to see the white cross.', setup: "L2 U' B2 U2 R2 U' F2", play: "F2 U R2 U2 B2 U L2", mask: 'daisy' },
          { t: 'quiz', q: 'A petal\'s side sticker is red and sits above the green centre. What next?', options: ['Turn F2 now', 'Turn U until it is above the red centre, then turn that face twice', 'Start again'], answer: 1, explain: 'Always match the side colour to its centre before the double turn.' },
          { t: 'tip', kind: 'pro', html: 'Later you will build the cross directly on the bottom, in about 6-8 moves, without the daisy. That is covered in the intermediate track.' },
        ],
      },
      {
        id: 'b-corners',
        title: 'Step 2 · White corners',
        minutes: 12,
        summary: 'Put each white corner above its slot and repeat R U R\' U\' until it drops in.',
        sections: [
          { t: 'p', html: 'Keep white on the <b>bottom</b>. A white corner has two other colours, which tell you exactly where it goes: the white-green-orange corner goes between the green and orange centres.' },
          { t: 'list', ordered: true, items: ['Find a white corner in the top layer.', 'Turn U until it sits directly above its home (between its two matching centres).', 'Turn the whole cube so that spot is at the front-right.', `Repeat ${alg("R U R' U'")} until the corner is solved. It takes 1, 3 or 5 repetitions.`] },
          { t: 'algs', keys: ['BEG:Trigger'] },
          { t: 'cube', caption: 'White facing right: one trigger does it.', setup: "U R U' R'", play: "R U R' U'", mask: 'firstLayer' },
          { t: 'cube', caption: 'White facing up: three triggers.', setup: "U R U' R' U R U' R' U R U' R'", play: "R U R' U' R U R' U' R U R' U'", mask: 'firstLayer' },
          { t: 'cube', caption: 'White facing front: five triggers.', setup: "U R U' R' U R U' R' U R U' R' U R U' R' U R U' R'", play: "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'", mask: 'firstLayer' },
          { t: 'tip', kind: 'warn', html: 'Corner stuck in the <b>bottom</b> layer but in the wrong spot or twisted? Hold it at the front-right and do one trigger. It pops up into the top layer and you continue as normal.' },
          { t: 'quiz', q: 'How many times can you need R U R\' U\' for one corner?', options: ['1, 2 or 3', '1, 3 or 5', 'Always 6'], answer: 1, explain: 'Each trigger twists the corner one step; six would return it to the start.' },
        ],
      },
      {
        id: 'b-middle',
        title: 'Step 3 · Middle layer',
        minutes: 12,
        summary: 'Insert the four middle edges with a left or right algorithm.',
        sections: [
          { t: 'p', html: 'Flip the cube so <b>yellow is on top</b> again; the white layer is now on the bottom and stays there for the rest of the solve.' },
          { t: 'list', ordered: true, items: ['Find an edge on top with <b>no yellow</b> on it.', 'Turn U until its front sticker matches the front centre (forming an upside-down T).', 'Look at its top sticker: does it match the right or the left centre?', 'Do the matching algorithm.'] },
          { t: 'algs', keys: ['BEG:Edge right', 'BEG:Edge left'] },
          { t: 'cube', caption: 'Edge belongs on the right.', caseOf: "U R U' R' U' F' U F", play: "U R U' R' U' F' U F", mask: 'f2l' },
          { t: 'cube', caption: 'Edge belongs on the left.', caseOf: "U' L' U L U F U' F'", play: "U' L' U L U F U' F'", mask: 'f2l' },
          { t: 'tip', kind: 'warn', html: 'Edge stuck in the middle layer but wrong or flipped? Do either algorithm with that edge in the front-right to kick it out to the top, then insert it properly.' },
          { t: 'tip', html: 'Notice both algorithms are "move the slot away, bring the edge in, fix the corner". Understanding that is the first step to the intuitive F2L you will learn later.' },
        ],
      },
      {
        id: 'b-yellow-cross',
        title: 'Step 4 · Yellow cross',
        minutes: 8,
        summary: 'Dot → L → line → cross with one algorithm: F R U R\' U\' F\'.',
        sections: [
          { t: 'p', html: 'Ignore the corners. Look only at the four <b>edges</b> on top and how many show yellow. You will see one of four patterns: a dot, an L, a line or the cross.' },
          { t: 'algs', keys: ['BEG:Yellow cross'] },
          { t: 'list', items: ['<b>Line</b>: hold it horizontally (left to right) and do the algorithm once.', '<b>L</b>: hold it so the two yellow edges are at the <b>back and left</b>, then do the algorithm. You get a line; do it again.', '<b>Dot</b>: do the algorithm from any side to get an L, then continue.'] },
          { t: 'cube', caption: 'Line → cross.', caseOf: "F R U R' U' F'", play: "F R U R' U' F'", mask: 'topEdges' },
          { t: 'cube', caption: 'L at the back-left → line → cross (algorithm twice).', caseOf: "F R U R' U' F' F R U R' U' F'", play: "F R U R' U' F' F R U R' U' F'", mask: 'topEdges' },
          { t: 'tip', html: 'You never need it more than three times. If you ever see exactly three yellow edges, a piece has been twisted out of the cube: pop it back the right way round.' },
        ],
      },
      {
        id: 'b-yellow-face',
        title: 'Step 5 · Yellow face',
        minutes: 12,
        summary: 'Use the Sune to turn every corner yellow-side up.',
        sections: [
          { t: 'p', html: 'Now get all of the top face yellow. Count the corners that already show yellow on top: 0, 1 or 2. Turn U until the <b>front-left</b> corner matches the rule below, then do the Sune.' },
          { t: 'algs', keys: ['BEG:Yellow face'] },
          { t: 'list', items: ['<b>1 yellow corner on top</b> (a "fish"): put it at the front-left.', '<b>0 on top</b>: turn U until the front-left corner\'s yellow faces <b>left</b>.', '<b>2 on top</b>: turn U until the front-left corner\'s yellow faces <b>you</b>.'] },
          { t: 'p', html: 'Repeat (re-checking the rule each time) until the top is all yellow. It takes at most three Sunes.' },
          { t: 'cube', caption: 'The fish: one Sune solves it.', caseOf: "R U R' U R U2 R'", play: "R U R' U R U2 R'" },
          { t: 'tip', kind: 'pro', html: 'This step is really "2-look OLL, corners part" done slowly. Later you will learn a dedicated algorithm for each of the 7 patterns so it always takes one go.' },
        ],
      },
      {
        id: 'b-yellow-corners',
        title: 'Step 6 · Yellow corners',
        minutes: 10,
        summary: 'Find headlights and swap the corners into place.',
        sections: [
          { t: 'p', html: 'Look at the sides of the top layer. <b>Headlights</b> are two corner stickers of the same colour on one side. They mean those two corners are already correct relative to each other.' },
          { t: 'algs', keys: ['BEG:Corners'] },
          { t: 'list', items: ['Headlights on one side: turn U so they are at the <b>back</b>, then do the algorithm.', 'Headlights on every side: corners are done.', 'No headlights anywhere: do the algorithm once from any angle; headlights will appear.'] },
          { t: 'p', html: 'Finish by turning U until the corners line up with their centres.' },
          { t: 'cube', caption: 'Headlights at the back.', caseOf: "R' F R' B2 R F' R' B2 R2", play: "R' F R' B2 R F' R' B2 R2" },
        ],
      },
      {
        id: 'b-yellow-edges',
        title: 'Step 7 · Yellow edges',
        minutes: 8,
        summary: 'Cycle the last three edges and finish your first solve.',
        sections: [
          { t: 'p', html: 'Corners are home. Usually one side now has a complete <b>solid bar</b> of one colour: that edge is already solved.' },
          { t: 'algs', keys: ['BEG:Edges'] },
          { t: 'list', items: ['Hold the solved bar at the <b>back</b> and do the algorithm. If it is not solved yet, do it once more (same position).', 'No solved side? Do it once from anywhere; a solved bar will appear.'] },
          { t: 'cube', caption: 'Bar at the back: one go.', caseOf: "R U' R U R U R U' R' U' R2", play: "R U' R U R U R U' R' U' R2" },
          { t: 'tip', html: 'That\'s it: <b>you can solve a Rubik\'s Cube</b>. Go to the Playground, press Scramble and do it again. Then time yourself in the Timer.' },
        ],
      },
      {
        id: 'b-first-solve',
        title: 'Your first full solve',
        minutes: 15,
        summary: 'A checklist to solve a scrambled cube on your own, plus common mistakes.',
        sections: [
          { t: 'list', ordered: true, items: ['Daisy → white cross on the bottom', 'White corners (R U R\' U\' trigger)', 'Flip; middle edges (left/right algs)', 'Yellow cross (F R U R\' U\' F\')', 'Yellow face (Sune, front-left rule)', 'Yellow corners (headlights at back)', 'Yellow edges (bar at back)'] },
          { t: 'h', text: 'Common mistakes' },
          { t: 'list', items: ['Turning L or D the wrong way (look at that face as if it were in front of you).', 'Forgetting to hold the cube the same way for the whole algorithm.', 'Losing your place mid-algorithm: say it out loud in chunks, e.g. "R U R\' U\'... F\' U F".', 'Using a stiff "store cube": a cheap speedcube makes everything easier.'] },
          { t: 'cube', caption: 'Scramble here, then solve it in the Playground with the step list above.', setup: "R U F' L2 D B' R2 U' F2 L D2 B U2 R' F" },
          { t: 'tip', kind: 'pro', html: 'Typical first-month times with this method are 1:30–3:00. To go below a minute, move on to the Intermediate track.' },
        ],
      },
    ],
  },
  {
    id: 'intermediate',
    title: 'Intermediate: 4-look CFOP',
    level: 'Level 2 · Sub-60 seconds',
    goal: 'Switch to CFOP: cross on the bottom, paired F2L, 2-look OLL and PLL.',
    color: '#0ea5e9',
    lessons: [
      {
        id: 'i-cfop',
        title: 'What is CFOP?',
        minutes: 5,
        summary: 'Cross, F2L, OLL, PLL: the method used by most of the world\'s fastest solvers.',
        sections: [
          { t: 'p', html: 'CFOP (also called the Fridrich method) is the beginner method made efficient:' },
          { t: 'list', items: ['<b>Cross</b> — white cross on the bottom, planned in inspection.', '<b>F2L</b> — First Two Layers: insert each white corner <i>together with</i> its middle edge, as a pair. Four pairs = two layers.', '<b>OLL</b> — Orient Last Layer: make the top all yellow in one algorithm (57 cases).', '<b>PLL</b> — Permute Last Layer: move the pieces into place in one algorithm (21 cases).'] },
          { t: 'p', html: 'You get there in stages. First learn <b>4-look last layer</b> (10 + 6 algorithms), then intuitive F2L, then full PLL, then full OLL.' },
          { t: 'tip', html: 'Average move counts: beginner ≈ 110–130 moves, 4-look CFOP ≈ 70–80, full CFOP ≈ 55–60. Fewer moves + fewer pauses = faster.' },
        ],
      },
      {
        id: 'i-cross',
        title: 'Cross on the bottom',
        minutes: 15,
        summary: 'Skip the daisy, build the cross directly on the bottom and plan it in inspection.',
        sections: [
          { t: 'p', html: 'Solving the cross on top and flipping wastes time and hides the F2L pieces. Build it directly on the <b>bottom</b>, so you can see the top and front during F2L.' },
          { t: 'list', items: ['During 15 s inspection, find all four white edges.', 'Plan the first two edges completely, then the rest roughly.', 'Solve edges relative to each other: two white edges that are already next to each other in the right order count as one.', 'Goal: every cross in 8 moves or fewer (the optimum is never more than 8).'] },
          { t: 'cube', caption: 'Only the cross pieces are coloured. This one takes 5 moves; play it, then reset and try to find it yourself.', setup: "D2 R U' R' F2", play: "F2 R U R' D2", mask: 'cross' },
          { t: 'tip', kind: 'pro', html: 'Practice drill: scramble, inspect for 15 s, close your eyes and solve the cross blind. Peek only at the end.' },
        ],
      },
      {
        id: 'i-f2l-intro',
        title: 'Intuitive F2L',
        minutes: 20,
        summary: 'Pair a corner with its edge in the top layer and insert them together.',
        sections: [
          { t: 'p', html: 'In F2L you look for a white corner and the matching middle edge (for example white-green-orange corner + green-orange edge), join them into a <b>pair</b> in the top layer, then insert the pair into its slot with one move like R U R\'.' },
          { t: 'h', text: 'The four basic inserts' },
          { t: 'p', html: 'Almost every F2L case is solved by turning it into one of these, so learn them first:' },
          { t: 'algs', keys: ['F2L:F2L 1', 'F2L:F2L 2', 'F2L:F2L 4'] },
          { t: 'cube', caption: `A ready-made pair: ${alg("R U R'")} inserts it.`, caseOf: "R U R'", play: "R U R'", mask: 'f2l' },
          { t: 'cube', caption: `${alg("U R U' R'")}: the U turn lines the pair up over its slot, then R U' R' drops it in.`, caseOf: "U R U' R'", play: "U R U' R'", mask: 'f2l' },
          { t: 'h', text: 'How to think' },
          { t: 'list', items: ['Hide the slot: turn R or F so the slot goes up, move the piece, bring it back.', 'Don\'t break what you already built: every "R" needs an "R\'" later.', 'Keep the white sticker of the corner off the top if possible; white on top is the awkward case.', 'Use the empty slot you are filling: it is free space to work in.'] },
          { t: 'tip', html: 'Learn intuitive F2L first, even if it\'s slower than your beginner corners+edges at the start. Within two weeks it overtakes, and it is the foundation of every faster time.' },
        ],
      },
      {
        id: 'i-oll2',
        title: '2-look OLL',
        minutes: 25,
        summary: 'Orient the last layer with 3 edge algorithms + 7 corner algorithms.',
        sections: [
          { t: 'p', html: 'Two looks: first make the yellow cross (edges), then make the corners yellow (exactly like the beginner method, but with one dedicated algorithm per case instead of repeating Sune).' },
          { t: 'h', text: 'Look 1: edges' },
          { t: 'algs', keys: ['OLL2:EO Line', 'OLL2:EO L', 'OLL2:EO Dot'] },
          { t: 'h', text: 'Look 2: corners' },
          { t: 'algs', keys: ['OLL2:CO Sune', 'OLL2:CO Antisune', 'OLL2:CO H', 'OLL2:CO Pi', 'OLL2:CO Headlights', 'OLL2:CO T', 'OLL2:CO L'] },
          { t: 'cube', caption: 'The Pi case. Try spotting the headlights on the left before you press play.', caseOf: "R U2 R2 U' R2 U' R2 U2 R", play: "R U2 R2 U' R2 U' R2 U2 R" },
          { t: 'tip', html: 'Learn Sune and Anti-Sune first (you already know Sune). With just those two you can solve every corner case in at most 2–3 goes, then add the others one per day.' },
        ],
      },
      {
        id: 'i-pll2',
        title: '2-look PLL',
        minutes: 25,
        summary: 'Permute corners (T or Y perm), then edges (U, H or Z perm).',
        sections: [
          { t: 'h', text: 'Look 1: corners' },
          { t: 'p', html: 'Find headlights. One side with headlights = adjacent swap (T-perm with headlights on the left). No headlights = diagonal swap (Y-perm). Headlights everywhere = corners already done.' },
          { t: 'algs', keys: ['PLL2:CP Headlights', 'PLL2:CP Diagonal'] },
          { t: 'h', text: 'Look 2: edges' },
          { t: 'algs', keys: ['PLL2:EP Ua', 'PLL2:EP Ub', 'PLL2:EP H', 'PLL2:EP Z'] },
          { t: 'cube', caption: 'T-perm: the most popular PLL in the world. Headlights on the left.', caseOf: "R U R' U' R' F R2 U' R' U' R U R' F'", play: "R U R' U' R' F R2 U' R' U' R U R' F'" },
          { t: 'cube', caption: 'H-perm with M slices: use ring and middle fingers to flick M2.', caseOf: 'M2 U M2 U2 M2 U M2', play: 'M2 U M2 U2 M2 U M2' },
        ],
      },
      {
        id: 'i-practice',
        title: 'Timing and practice',
        minutes: 8,
        summary: 'Averages, what to measure, and how to practise without plateauing.',
        sections: [
          { t: 'p', html: 'Single solves are noisy. Cubers track averages: <b>ao5</b> (best and worst of 5 dropped, mean of the middle 3) and <b>ao12</b> (best and worst dropped, mean of 10). This app\'s Timer computes them automatically.' },
          { t: 'list', items: ['Do <b>focused practice</b> (one step at a time: 20 crosses, 20 F2L pairs) not just full solves.', 'Learn new algorithms in small batches (2–4 per day) and drill them in the Trainer.', 'Slow solves with zero pauses beat fast solves with long pauses.'] },
          { t: 'quiz', q: 'Times: 20, 25, 22, 40, 23. What is the ao5?', options: ['26.0', '23.3', '22.5'], answer: 1, explain: 'Drop 20 and 40, mean of 25, 22, 23 = 23.33.' },
        ],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced CFOP',
    level: 'Level 3 · Sub-30 → sub-20',
    goal: 'Full PLL, F2L mastery, full OLL, lookahead and finger tricks.',
    color: '#f59e0b',
    lessons: [
      {
        id: 'a-pll',
        title: 'Full PLL (21)',
        minutes: 30,
        summary: 'One-look PLL and how to recognise all 21 cases from two sides.',
        sections: [
          { t: 'p', html: 'Learn full PLL before full OLL: there are only 21 cases, you will see one every solve, and it cuts ~3–4 seconds immediately.' },
          { t: 'h', text: 'Recognition from two sides' },
          { t: 'p', html: 'You can see the front and right sides without rotating. Look for: <b>headlights</b> (matching corners on one side), <b>2x1 blocks</b> (corner + edge that match), <b>bars</b> (whole side solved), and colour relationships (adjacent vs opposite colours).' },
          { t: 'list', items: ['<b>Matching corners on all four sides</b> → edges-only: U, H or Z.', '<b>Matching corners on exactly one side</b> (headlights or a full bar) → A, T, F, J, R or G.', '<b>No matching corners anywhere</b> → V, Y, N or E.', 'Then narrow it down with blocks and bars; each case\'s tip in the library says what to look for.'] },
          { t: 'tip', html: 'Suggested order: (1) the 6 you know, (2) A-perms and J-perms, (3) the remaining T, F, R, V, Y, (4) N and E, (5) the four G-perms last.' },
          { t: 'p', html: 'Open the <a href="#/algs/PLL">PLL library</a> to see every case, mark them as learning, and drill them in the <a href="#/trainer">Trainer</a>.' },
          { t: 'cube', caption: 'Jb-perm: a 2x1 block on three sides and a bar on the left.', caseOf: "R U R' F' R U R' U' R' F R2 U' R'", play: "R U R' F' R U R' U' R' F R2 U' R'" },
        ],
      },
      {
        id: 'a-f2l',
        title: 'F2L mastery (41 cases)',
        minutes: 40,
        summary: 'All 41 cases, empty-slot tricks, and why intuition still matters.',
        sections: [
          { t: 'p', html: 'Every F2L situation reduces to one of 41 cases for a given slot. Knowing an efficient solution to each removes "thinking time" and lets you look ahead.' },
          { t: 'list', items: ['<b>Both in the top layer</b> (24 cases): the most common. Learn these first.', '<b>Edge in slot</b> (6) and <b>corner in slot</b> (6): pull the piece out efficiently.', '<b>Both in slot</b> (5): including the "pair in slot but wrong" cases.'] },
          { t: 'p', html: 'The <a href="#/algs/F2L">F2L library</a> lists a short, move-optimal &lt;R, U, F&gt; solution to every case for the front-right slot. Mirror them for the front-left slot by flipping every move left-to-right (R→L\', R\'→L, U→U\', U\'→U, F→F\', F\'→F), or turn the cube with y/y\'.' },
          { t: 'cube', caption: 'Both pieces on top but not paired: watch how the pair is built first, then inserted.', caseOf: "R U2 R' U' R U R'", play: "R U2 R' U' R U R'", mask: 'f2l' },
          { t: 'h', text: 'Advanced tricks' },
          { t: 'list', items: ['<b>Use empty slots</b>: an unsolved back slot gives you extra free moves for pairing.', '<b>Avoid rotations</b>: solve back slots with R/L/U moves rather than y2.', '<b>Keyhole</b>: insert a corner or edge through an empty slot when its partner is already solved.', '<b>Multi-slotting</b>: while inserting one pair, set up the next.'] },
        ],
      },
      {
        id: 'a-oll',
        title: 'Full OLL (57)',
        minutes: 60,
        summary: 'A learning order for 57 OLLs that pays off fast.',
        sections: [
          { t: 'p', html: 'Full OLL saves one look per solve. It is a big project, so be smart about order:' },
          { t: 'list', ordered: true, items: ['The 7 corner cases you already know (OCLL, cross already made).', 'Easy "T, P, C, W, fish" shapes that reuse familiar triggers (OLL 33, 37, 43–46).', 'Lightning and square shapes (OLL 5–8, 11, 12, 39, 40).', 'Line and small-L cases (OLL 47–56).', 'Dot cases (OLL 1–4, 17–20) last: they are rarer and longest.'] },
          { t: 'tip', html: 'Learn 2–3 new OLLs per day. Each day: drill yesterday\'s in the Trainer, then add new ones. 57 cases ≈ 4 weeks.' },
          { t: 'cube', caption: 'OLL 45 (the T) is just your edge algorithm: you already know it!', caseOf: "F R U R' U' F'", play: "F R U R' U' F'" },
          { t: 'p', html: 'Browse them in the <a href="#/algs/OLL">OLL library</a>.' },
        ],
      },
      {
        id: 'a-lookahead',
        title: 'Lookahead',
        minutes: 15,
        summary: 'Track the next pair while solving the current one; the biggest single speed skill.',
        sections: [
          { t: 'p', html: 'Top solvers turn at a moderate speed but <b>never stop</b>. While their hands solve one F2L pair, their eyes are already finding the next.' },
          { t: 'list', items: ['<b>Slow solves</b>: solve at 50% speed with zero pauses. If you pause, slow down further.', '<b>Metronome</b>: one move per beat at 60 bpm, then 80, 100.', '<b>Cross + first pair</b> in inspection: plan the cross, then find where the first pair goes.', 'Know where pieces go without looking at them directly (peripheral recognition).'] },
          { t: 'tip', kind: 'pro', html: 'Record your solves and count the pause frames. Turning speed (TPS) only matters after the pauses are gone.' },
        ],
      },
      {
        id: 'a-fingertricks',
        title: 'Finger tricks and TPS',
        minutes: 15,
        summary: 'Flicks, regrips and "algorithm flow".',
        sections: [
          { t: 'list', items: ['<b>U</b> right index flick, <b>U\'</b> left index flick, <b>U2</b> two index flicks (double flick).', '<b>F</b> right index pushing the front-top, <b>F\'</b> right thumb.', '<b>D</b> left ring finger, <b>D\'</b> right ring finger.', '<b>M</b> / <b>M\'</b> with the left ring finger; M2 with ring + middle.', 'Learn each alg <b>with</b> its finger tricks, never relearn later.', 'Regrip only where needed; good algs are chosen for no regrips.'] },
          { t: 'cube', caption: `Drill ${alg("R U R' U'")} for 30 s daily: target 6+ repetitions in 5 seconds.`, play: "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'" },
        ],
      },
    ],
  },
  {
    id: 'pro',
    title: 'Pro',
    level: 'Level 4 · Sub-15 and beyond',
    goal: 'Efficiency, colour neutrality, advanced last-layer systems and competition.',
    color: '#ef4444',
    lessons: [
      {
        id: 'p-xcross',
        title: 'X-cross and inspection',
        minutes: 15,
        summary: 'Solve the cross and first pair together.',
        sections: [
          { t: 'p', html: 'An <b>X-cross</b> (extended cross) solves the cross and one F2L pair in one go, usually 9–11 moves. Even planning "cross + first pair" reliably saves 1–2 s.' },
          { t: 'list', items: ['In inspection, find the cross, then look for a pair that is already connected or one move from it.', 'Look for cross solutions that happen to also pair up a corner and edge.', 'Practice with an x-cross trainer: reveal optimal solutions after each attempt.'] },
        ],
      },
      {
        id: 'p-cn',
        title: 'Colour neutrality',
        minutes: 10,
        summary: 'Solve the cross on any colour for shorter crosses and better first pairs.',
        sections: [
          { t: 'p', html: 'Always using white wastes good starts. <b>Dual-colour neutral</b> (white + yellow) or <b>full colour neutral</b> (any of six) solvers pick the easiest cross each solve; a 6-colour-neutral solver averages roughly a move shorter on the cross.' },
          { t: 'tip', html: 'Transition gradually: add yellow cross for one week (your F2L recognition will feel strange), then others.' },
        ],
      },
      {
        id: 'p-ll',
        title: 'Advanced last layer',
        minutes: 15,
        summary: 'AUF prediction, COLL, OLL skips, edge control and ZBLL.',
        sections: [
          { t: 'list', items: ['<b>AUF prediction</b>: know the U turn needed after PLL before you start it.', '<b>Two-sided PLL recognition</b>: recognise every PLL from just front and right.', '<b>COLL</b> (42 algs): when edges are oriented, orient + permute corners together, leaving an easy U/H/Z/skip.', '<b>Winter Variation / VLS</b>: orient the last layer while inserting the last pair.', '<b>ZBLL</b> (≈ 472 algs): solve the whole last layer in one algorithm when edges are oriented. Used by many world-class solvers.'] },
          { t: 'tip', kind: 'pro', html: 'Rule of thumb: until your average is around 12–14 s, F2L and lookahead give much more than new last-layer algorithm sets.' },
        ],
      },
      {
        id: 'p-methods',
        title: 'Other methods',
        minutes: 12,
        summary: 'Roux, ZZ and Petrus, and when you might choose them.',
        sections: [
          { t: 'list', items: ['<b>Roux</b>: build two 1x2x3 blocks on the left and right, solve the top corners (CMLL), then finish with M and U moves (LSE). Very low move count (~48) and few rotations; ideal for one-handed.', '<b>ZZ</b>: orient all edges first (EOLine), so the rest of the solve needs only R, U, L moves. Great for ergonomic, rotationless turning; pairs with ZBLL.', '<b>Petrus</b>: 2x2x2 block, extend to 2x2x3, orient edges, finish F2L and the last layer. Very efficient and good for learning blockbuilding.'] },
          { t: 'p', html: 'CFOP remains the most common method among top speedsolvers because it is easy to look ahead and to turn quickly. Learn a second method for fun; it will make your CFOP blockbuilding better.' },
        ],
      },
      {
        id: 'p-training',
        title: 'Training like a pro',
        minutes: 12,
        summary: 'Deliberate practice, splits, reconstructions and competitions.',
        sections: [
          { t: 'list', items: ['<b>Splits</b>: time cross, F2L, OLL, PLL separately. Fix the slowest part first.', '<b>Reconstruct</b> your fast and slow solves move by move; compare against top solvers\' reconstructions.', '<b>Mix sessions</b>: 70% full solves, 30% drills (algs, pairs, slow solves).', '<b>Rest</b>: progress happens between sessions. Several short sessions beat one marathon.', '<b>Compete</b>: official WCA competitions use 15 s inspection and average of 5 rounds. Penalty: +2 for over-inspection or a face misaligned by more than 45°.'] },
          { t: 'tip', html: 'Hardware matters at this level: a flagship magnetic cube, tuned tensions and a good lube make turning consistent.' },
        ],
      },
    ],
  },
];

export const ALL_LESSONS = TRACKS.flatMap((t) => t.lessons.map((l) => ({ ...l, track: t })));

export function lessonById(id: string) {
  return ALL_LESSONS.find((l) => l.id === id);
}
