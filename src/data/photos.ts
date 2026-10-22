/**
 * Photos used in Theory, self-hosted from Wikimedia Commons (public/photos).
 * Each keeps the author, licence and source page its licence asks us to show.
 * tests/theory.test.ts checks every file exists and every credit is filled in.
 */
import type { Photo } from './curriculum';

const commons = (name: string) => `https://commons.wikimedia.org/wiki/File:${name}`;

export const PHOTOS = {
  rubik: { file: 'rubik.jpg', w: 600, h: 800, alt: 'Portrait of Ernő Rubik, grey-haired, in a dark jacket and white turtleneck', author: 'Babak Mansouri (cropped by Rlevente)', license: 'CC0', source: commons('Rubik_Ern%C5%91_cropped.jpg') },
  original1980: { file: 'original-1980.jpg', w: 640, h: 698, alt: 'An original 1980 Rubik’s Cube made in Hungary, with black plastic and bright stickers', author: 'Racomi', license: 'CC BY-SA 4.0', source: commons('Original_Rubik%27s_cube_from_1980.jpg') },
  nicholsPatent: { file: 'nichols-patent.png', w: 900, h: 637, alt: 'Line drawing from Larry Nichols’ 1972 patent showing a 2×2×2 cube held together by magnets', author: 'Larry D. Nichols (US patent 3,655,201)', license: 'Public domain', source: commons('Patent_US3655201.png') },
  expo82: { file: 'expo82.jpg', w: 640, h: 853, alt: 'A giant Rubik’s Cube on display, taller than a person', author: 'AppalachianCentrist', license: 'CC BY-SA 4.0', source: commons('Expo_82_Rubik%27s_Cube.jpg') },
  disassembled: { file: 'disassembled.jpg', w: 900, h: 675, alt: 'A Rubik’s Cube taken apart: the six-armed core with centres, and loose edge and corner pieces showing their hidden feet', author: 'Curis (en.wikipedia)', license: 'CC BY 2.5', source: commons('Disassembled-rubic-cube-1.jpg') },
  variants: { file: 'variants.jpg', w: 900, h: 558, alt: 'Scrambled cubes from 2×2×2 up to 7×7×7 lined up by size', author: 'Hellbus', license: 'CC BY-SA 3.0', source: commons('Rubik%27s_Cube_variants.jpg') },
  platonic: { file: 'platonic.jpg', w: 1200, h: 283, alt: 'Five twisty puzzles shaped like the five Platonic solids', author: 'Monktues', license: 'CC BY-SA 4.0', source: commons('Rubiks_Platonic_Solids.jpg') },
  big13: { file: '13x13.jpg', w: 640, h: 640, alt: 'A 13×13×13 cube showing a superflip-style pattern', author: 'BIG DADDY Dunkleosteus', license: 'CC0', source: commons('13x13_Rubik%27s_cube_-_Superflip_(cropped).jpg') },
  feliks: { file: 'feliks.jpg', w: 900, h: 597, alt: 'Feliks Zemdegs at a competition table, about to start a 3×3 solve', author: 'Christophe Grosjean', license: 'CC BY-SA 4.0', source: commons('Feliks_Zemdegs_at_Swisscubing_Cup_Final_2018.jpg') },
  maxPark: { file: 'max-park.jpg', w: 600, h: 801, alt: 'Max Park holding a 5×5 cube moments after a world-record average', author: 'Just a cuber', license: 'CC0', source: commons('Max_Park_WR_Average_(cropped).jpg') },
  blindfolded: { file: 'blindfolded.jpg', w: 900, h: 599, alt: 'A blindfolded competitor wearing ear defenders holds a scrambled cube while a judge holds a scramble sheet', author: 'Le Commissaire (Mickaël Schauli)', license: 'CC BY-SA 4.0', source: commons('Championnat_de_France_de_Speedcubing_2024_%E2%80%A2_Saverne_-_35.jpg') },
  megaminx: { file: 'megaminx.jpg', w: 900, h: 675, alt: 'Competitors solving dodecahedral Megaminx puzzles at a table', author: 'Ivo Kruusamägi', license: 'CC BY-SA 3.0', source: commons('Megaminx,_Estonian_Open_2011.jpg') },
  tartu: { file: 'tartu-open.jpg', w: 900, h: 598, alt: 'A competition hall with solving stations, timers and display screens, spectators seated in the foreground', author: 'Ivo Kruusamägi', license: 'CC BY-SA 4.0', source: commons('Tartu_Open_2017_speedcubing_competition.jpg') },
  stackmat: { file: 'stackmat.jpg', w: 900, h: 161, alt: 'A StackMat timer showing 9.09, with a hand-shaped touch pad at each end', author: 'Jorick Horn', license: 'Public domain', source: commons('StackMat@9.09.jpg') },
  rubot: { file: 'rubot.jpg', w: 593, h: 703, alt: 'RuBot II, a humanoid robot, holding and turning a Rubik’s Cube', author: 'Maria Keays', license: 'CC BY 2.0', source: commons('RuBot_II.jpg') },
} satisfies Record<string, Photo>;
