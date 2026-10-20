// One timeline for the promo, shared by the video and the audio mixer.
// No imports and erasable syntax only: scripts/render.mjs imports this file
// directly with Node's type stripping to write out/cues.json for mix_audio.py.

export const FPS = 30;

export type SceneId = 'tabs' | 'waiting' | 'tray' | 'hover' | 'sounds' | 'jump' | 'toast' | 'end';

export const SCENES: {id: SceneId; from: number; dur: number}[] = [
  {id: 'tabs', from: 0, dur: 120},
  {id: 'waiting', from: 120, dur: 135},
  {id: 'tray', from: 255, dur: 150},
  {id: 'hover', from: 405, dur: 135},
  {id: 'sounds', from: 540, dur: 225},
  {id: 'jump', from: 765, dur: 165},
  {id: 'toast', from: 930, dur: 135},
  {id: 'end', from: 1065, dur: 150},
];

export const PROMO_DUR = 1215; // 40.5 s

/** Key frames of the promo, absolute. */
export const K = {
  termIn: 6, // first window; each next one +TERM_STEP
  slideAside: 126,
  timerStart: 150,
  timerFastEnd: 205,
  slideBack: 255,
  zoomIn: 262,
  zoomInEnd: 294,
  iconIn: 282,
  needs: 300,
  zoomOut: 340,
  zoomOutEnd: 370,
  needsToast: 366,
  needsToastOut: 416,
  cursorIn: 410,
  hoverIcon: 432,
  popupOpen: 436,
  rowsIn: 442, // each next row +ROW_STEP
  pushIn: 478,
  pushInEnd: 510,
  chips: [552, 575, 598, 621, 644],
  pickerClick: 686,
  pickerBack: 738,
  rowHover: 782,
  rowClick: 792,
  popupClose: 794,
  pushOut: 794,
  pushOutEnd: 826,
  front: 800,
  keyPress: 830,
  answer: 836,
  working: 842,
  testsPass: 872,
  finished: 952,
  stageOut: 1050,
  end: 1065,
};

export const TERM_STEP = 12;
export const ROW_STEP = 5;

/** The app repeats the needs-you sound once, min(len, 0.7) + 0.18 s later. Marimba: 0.654 s. */
export const NEEDS_REPEAT_F = 20;

export type SoundId = 'marimba' | 'glass' | 'wood' | 'blip' | 'chirp';

/** Sound cues for the mixer. 'needs' plays twice, 'done' and 'play' once. */
export const CUES: {frame: number; sound: SoundId; kind: 'needs' | 'done' | 'play'}[] = [
  {frame: K.needs, sound: 'marimba', kind: 'needs'},
  {frame: K.chips[0], sound: 'marimba', kind: 'play'},
  {frame: K.chips[1], sound: 'glass', kind: 'play'},
  {frame: K.chips[2], sound: 'wood', kind: 'play'},
  {frame: K.chips[3], sound: 'blip', kind: 'play'},
  {frame: K.chips[4], sound: 'chirp', kind: 'play'},
  {frame: K.finished, sound: 'marimba', kind: 'done'},
];

/** Hero GIF: 9 s, loops. */
export const HERO_DUR = 270;
export const H = {
  needs: 18,
  cursorGo: 45,
  cursorAtIcon: 68,
  popupOpen: 72,
  rowsIn: 78, // +4 per row
  rowHover: 124,
  rowClick: 150,
  popupClose: 152,
  front: 158,
  keyPress: 180,
  answer: 186,
  working: 190,
  cursorBack: 200,
  cursorHome: 230,
  /** The cursor clicks the docs-site window: it comes to the front again, as at frame 0. */
  reset: 240,
};
