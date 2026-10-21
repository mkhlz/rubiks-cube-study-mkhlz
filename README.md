<div align="center">

# 🧊 CubeCraft Academy

**Learn the Rubik's Cube from your very first twist to speedcuber, with a real 3D cube you can turn.**

[**▶ Open the app**](https://mkhlz.github.io/rubiks-cube-study-mkhlz/) · [Course](https://mkhlz.github.io/rubiks-cube-study-mkhlz/#/learn) · [Algorithms](https://mkhlz.github.io/rubiks-cube-study-mkhlz/#/algs) · [Timer](https://mkhlz.github.io/rubiks-cube-study-mkhlz/#/timer)

![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r186-000?logo=three.js)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Tests](https://img.shields.io/badge/tests-145%20passing-22c55e)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

CubeCraft Academy is a free, open-source study app for the 3x3 Rubik's Cube. It takes someone who has never solved a cube through the beginner method to a first solve, then step by step through CFOP (cross, F2L, OLL, PLL) and on to advanced and pro techniques. Every lesson has an interactive 3D cube, every algorithm is checked by automated tests, and your progress, solve times and study-plan ticks are saved in your browser.

## Features

| | |
|---|---|
| 🎓 **28-lesson course** | Five tracks: Foundations → Beginner method → 4-look CFOP → Advanced CFOP → Pro. Each lesson has live 3D demos you can step through, quizzes and tips. |
| 🧊 **Playable 3D cube** | Drag a layer to turn it, orbit with the mouse or touch, use the keyboard (`R U R' U'` = <kbd>r</kbd> <kbd>u</kbd> <kbd>⇧R</kbd> <kbd>⇧U</kbd>), scramble, undo, rewind, type any algorithm, or load "the case this algorithm solves". Supports face, slice (M E S), wide (r, Rw…) moves and rotations (x y z). |
| 📚 **142 algorithms** | Beginner (7), 2-look OLL (10), 2-look PLL (6), all **41 F2L**, all **57 OLL** and all **21 PLL** cases, with recognition tips and auto-generated case diagrams. Track each as new / learning / learned. |
| 🧠 **Spaced-repetition trainer** | Flashcards for any set: see a case, recall, reveal (with a 3D replay), grade Again / Hard / Good / Easy. Leitner boxes bring weak cases back sooner. |
| ⏱️ **Speedsolving timer** | Hold-to-arm spacebar or touch timer, optional 15 s WCA-style inspection (with +2 / DNF), scrambles with an unfolded preview, best, ao5, ao12, ao100 and best ao5. |
| 🗓️ **Study plans** | Week-by-week plans with daily routines, linked tasks and checkpoints: *Zero to first solve*, *Sub-1 minute*, *Sub-30*, *Sub-20* and *Sub-15 and beyond*. |
| 🌗 **Polished UI** | Light & dark themes, responsive down to phone width, export / import your progress as JSON. |

## Correct by construction

Cube apps live or die by whether their moves and algorithms are right, so this one tests them instead of trusting them:

- **Cube engine** (`src/cube/engine.ts`): 26 cubies with integer positions and rotation matrices, so there's no floating-point drift. The tests check it against known Kociemba facelet strings, move orders (e.g. the sexy move has order 6 and the T-perm order 2), and wide, slice and rotation identities (`r = R M'`, `x = R M' L'`, …).
- **Every algorithm is validated** (`tests/algs.test.ts`):
  - Each OLL and PLL must leave the first two layers intact.
  - Each PLL must keep the top oriented.
  - All 57 OLLs and all 21 PLLs must be *different* cases, compared up to AUF and viewing angle.
- **F2L is generated, not transcribed**: `scripts/gen-f2l.ts` enumerates every placement of the front-right corner and edge, finds exactly 41 cases, and solves each one with a bidirectional search in ⟨R, U, F⟩ that keeps the cross and other slots intact.
- **The beginner method is executed by a test** (`tests/method.test.ts`): the exact rules the lessons teach (front-left Sune rule, headlights at the back, solved bar at the back, …) solve 400 random last layers. The test also confirms the step counts the lessons promise.
- **Diagrams can't disagree with algorithms.** Each case picture is drawn by applying the algorithm's inverse to a solved cube.

## Course outline

1. **Foundations**: pieces (centres, edges, corners), Singmaster notation with a live cube per move, grip & turning.
2. **Beginner method**: daisy → white cross → white corners → middle layer → yellow cross → yellow face → yellow corners → yellow edges.
3. **Intermediate (4-look CFOP)**: what CFOP is, cross on the bottom, intuitive F2L, 2-look OLL, 2-look PLL, averages & practice.
4. **Advanced CFOP**: full PLL & recognition, F2L mastery (41 cases), full OLL learning order, lookahead, finger tricks.
5. **Pro**: x-cross, colour neutrality, advanced last layer (COLL, ZBLL, AUF prediction), Roux / ZZ / Petrus, training & competitions.

## Quick start

```bash
git clone https://github.com/mkhlz/rubiks-cube-study-mkhlz.git
cd rubiks-cube-study-mkhlz
npm install
npm run dev        # http://localhost:5173/rubiks-cube-study-mkhlz/
npm test           # engine, algorithm and method tests
npm run build      # production build in dist/
npx tsx scripts/gen-f2l.ts   # regenerate the F2L algorithm set
```

Pushing to `main` runs the tests and deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Project structure

```
src/
  cube/        engine (state + moves), renderer (Three.js, drag-to-turn), diagrams (SVG), cases, scrambler
  data/        algorithms, generated F2L, curriculum (lessons), study plans
  views/       home, course & lessons, playground, algorithm library, trainer, timer, plans
  store.ts     localStorage progress + spaced repetition
tests/         engine, algorithms, beginner-method and stats tests
scripts/       F2L generator
```

## Prior art & credits

These open-source projects were looked at while planning this one. No code was copied; the cube engine, renderer and content were written for this project.

- [cubing.js](https://js.cubing.net/cubing/): the reference twisty-puzzle library (`<twisty-player>`) and alg notation.
- [CubeCoach](https://github.com/kameron-ctrl/CubeCoach): Three.js cube + coaching + OLL/PLL flashcards.
- [Cubedex](https://github.com/poliva/cubedex): offline OLL/PLL trainer for smart cubes.
- [ligangwang/rubikscube](https://github.com/ligangwang/rubikscube): 3D cube with a beginner method.
- [Fridrich Trainer](https://github.com/Darguima/FridrichTrainer): CFOP trainer app.

The OLL and PLL algorithms are standard community algorithms used across the speedcubing community; case nicknames follow common usage. Scrambles are random-move scrambles, not WCA random-state scrambles.

## License

[MIT](LICENSE) © mkhlz
