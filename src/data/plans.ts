/** Week-by-week study plans. Each task is a checkbox saved in progress. */

export interface PlanWeek {
  title: string;
  focus: string;
  daily: string[];
  tasks: { id: string; text: string; link?: string }[];
  checkpoint: string;
}

export interface Plan {
  id: string;
  title: string;
  from: string;
  to: string;
  weeks: PlanWeek[];
  minutesPerDay: number;
}

let n = 0;
const task = (text: string, link?: string) => ({ id: `t${++n}`, text, link });

export const PLANS: Plan[] = [
  {
    id: 'first-solve',
    title: 'Zero to first solve',
    from: 'Never solved',
    to: 'Solve it alone',
    minutesPerDay: 20,
    weeks: [
      {
        title: 'Week 1',
        focus: 'Learn the 7 beginner steps one evening at a time.',
        daily: ['5 min: review yesterday\'s step', '10 min: today\'s lesson with the 3D cube', '5 min: solve up to today\'s step on a scrambled cube'],
        tasks: [
          task('Day 1: Meet the cube + move notation', '#/learn/f-notation'),
          task('Day 2: White cross (daisy)', '#/learn/b-cross'),
          task('Day 3: White corners', '#/learn/b-corners'),
          task('Day 4: Middle layer', '#/learn/b-middle'),
          task('Day 5: Yellow cross + yellow face', '#/learn/b-yellow-face'),
          task('Day 6: Yellow corners + yellow edges', '#/learn/b-yellow-edges'),
          task('Day 7: Three full solves with the lesson open, one without', '#/learn/b-first-solve'),
        ],
        checkpoint: 'One complete solve without looking anything up.',
      },
      {
        title: 'Week 2',
        focus: 'Make it automatic.',
        daily: ['10 full solves, timed', 'Say each algorithm out loud in chunks'],
        tasks: [
          task('Memorise all 7 beginner algorithms (Trainer → Beginner)', '#/trainer'),
          task('10 timed solves in one session', '#/timer'),
          task('Get an ao5 under 3:00'),
          task('Read: holding and turning', '#/learn/f-handling'),
        ],
        checkpoint: 'ao5 under 3 minutes.',
      },
    ],
  },
  {
    id: 'sub-60',
    title: 'Sub-1 minute',
    from: '~2–3 min',
    to: 'Sub-60 s',
    minutesPerDay: 30,
    weeks: [
      {
        title: 'Week 1',
        focus: 'Cross on the bottom + 2-look OLL edges.',
        daily: ['10 min: cross drills (inspect 15 s, solve cross only)', '10 min: new algorithms', '10 min: full solves'],
        tasks: [task('Lesson: What is CFOP?', '#/learn/i-cfop'), task('Lesson: Cross on the bottom', '#/learn/i-cross'), task('Learn 3 edge-orientation algorithms', '#/algs/OLL2'), task('20 crosses on the bottom without the daisy')],
        checkpoint: 'Cross on the bottom every solve.',
      },
      {
        title: 'Week 2',
        focus: '2-look OLL corners.',
        daily: ['Learn 2 corner algorithms per day', 'Drill in Trainer', 'Full solves using them'],
        tasks: [task('Lesson: 2-look OLL', '#/learn/i-oll2'), task('Sune, Anti-Sune, H, Pi'), task('Headlights, T, L (Bowtie)'), task('Recognise all 7 corner cases instantly in Trainer', '#/trainer')],
        checkpoint: 'Orient the last layer in exactly 2 algorithms.',
      },
      {
        title: 'Week 3',
        focus: '2-look PLL.',
        daily: ['Learn T-perm and Y-perm', 'Then Ua, Ub, H, Z', 'Full solves'],
        tasks: [task('Lesson: 2-look PLL', '#/learn/i-pll2'), task('T-perm and Y-perm'), task('Ua, Ub, H and Z perms'), task('ao12 in the Timer', '#/timer')],
        checkpoint: '4-look last layer in every solve.',
      },
      {
        title: 'Week 4',
        focus: 'Intuitive F2L.',
        daily: ['15 min: F2L pairs only (scramble, solve cross, then pairs slowly)', '15 min: full solves'],
        tasks: [task('Lesson: Intuitive F2L', '#/learn/i-f2l-intro'), task('Basic inserts R U R\', F\' U\' F, U R U\' R\''), task('Solve all four pairs without beginner corners/edges'), task('Lesson: Timing and practice', '#/learn/i-practice')],
        checkpoint: 'ao12 under 60 seconds.',
      },
    ],
  },
  {
    id: 'sub-30',
    title: 'Sub-30 seconds',
    from: '~45–60 s',
    to: 'Sub-30 s',
    minutesPerDay: 45,
    weeks: [
      { title: 'Weeks 1–2', focus: 'Full PLL.', daily: ['2 new PLLs per day', 'Trainer review of all known PLLs', '20 full solves'], tasks: [task('Lesson: Full PLL', '#/learn/a-pll'), task('A-perms, J-perms'), task('T, F, R, V, Y perms'), task('N, E perms'), task('Ga, Gb, Gc, Gd perms'), task('Mark all 21 PLLs as learned', '#/algs/PLL')], checkpoint: 'Every PLL in one look.' },
      { title: 'Weeks 3–4', focus: 'F2L efficiency.', daily: ['10 min slow solves (no pauses)', '10 min F2L cases', '20 full solves'], tasks: [task('Lesson: F2L mastery', '#/learn/a-f2l'), task('Learn the 24 "both in top" F2L cases', '#/algs/F2L'), task('Learn the edge/corner-in-slot cases'), task('Lesson: Lookahead', '#/learn/a-lookahead')], checkpoint: 'F2L under 20 s on average.' },
      { title: 'Weeks 5–6', focus: 'Finger tricks + first OLLs.', daily: ['5 min trigger drills', '3 new OLLs per day', 'Full solves'], tasks: [task('Lesson: Finger tricks', '#/learn/a-fingertricks'), task('Learn OLL 33, 37, 43–48 (easy shapes)'), task('Learn lightning & square OLLs'), task('ao50 under 30 s', '#/timer')], checkpoint: 'ao12 under 30 seconds.' },
    ],
  },
  {
    id: 'sub-20',
    title: 'Sub-20 seconds',
    from: '~25–30 s',
    to: 'Sub-20 s',
    minutesPerDay: 60,
    weeks: [
      { title: 'Weeks 1–4', focus: 'Finish full OLL.', daily: ['3 new OLLs per day', 'Trainer: due cards first', '30 full solves'], tasks: [task('Lesson: Full OLL', '#/learn/a-oll'), task('Line + small-L OLLs'), task('Knight-move, awkward, P, C, W OLLs'), task('Dot OLLs'), task('Mark all 57 OLLs as learned', '#/algs/OLL')], checkpoint: 'Every OLL in one look.' },
      { title: 'Weeks 5–8', focus: 'Lookahead and efficiency.', daily: ['10 min metronome slow solves', '10 min cross + 1 in inspection', '30 full solves'], tasks: [task('Plan cross + first pair in inspection'), task('Lesson: X-cross', '#/learn/p-xcross'), task('Rotationless back-slot F2L'), task('Reconstruct 5 of your solves')], checkpoint: 'ao100 under 20 s.' },
    ],
  },
  {
    id: 'sub-15',
    title: 'Sub-15 and beyond',
    from: '~18–20 s',
    to: 'Sub-15 s',
    minutesPerDay: 60,
    weeks: [
      { title: 'Phase 1', focus: 'Colour neutrality and splits.', daily: ['Half your solves on yellow cross', 'Time splits weekly'], tasks: [task('Lesson: Colour neutrality', '#/learn/p-cn'), task('Dual colour neutral (white + yellow)'), task('Lesson: Training like a pro', '#/learn/p-training')], checkpoint: 'Equal averages on white and yellow.' },
      { title: 'Phase 2', focus: 'Last-layer extensions.', daily: ['AUF prediction during PLL recognition', 'COLL subset per week'], tasks: [task('Lesson: Advanced last layer', '#/learn/p-ll'), task('Two-sided recognition for all PLLs'), task('COLL for Sune and Anti-Sune'), task('Enter a WCA competition')], checkpoint: 'ao12 under 15 s.' },
      { title: 'Phase 3', focus: 'Explore.', daily: ['One session a week on another method'], tasks: [task('Lesson: Other methods', '#/learn/p-methods'), task('Try Roux for a week'), task('Start ZBLL or one-handed')], checkpoint: 'You decide the next goal.' },
    ],
  },
];
