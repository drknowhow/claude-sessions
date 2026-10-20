import {loadFont as loadManrope} from '@remotion/google-fonts/Manrope';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

const manrope = loadManrope('normal', {weights: ['500', '600', '700', '800'], subsets: ['latin']});
const inter = loadInter('normal', {weights: ['400', '500', '600', '700'], subsets: ['latin']});
const mono = loadMono('normal', {weights: ['400', '500', '700'], subsets: ['latin']});

export const F = {
  display: manrope.fontFamily,
  body: inter.fontFamily,
  mono: mono.fontFamily,
};

/** Brand and app colours, from the app's popup.css and docs/brand/mark.svg. */
export const C = {
  // States
  needs: '#f59e0b',
  error: '#ef4444',
  done: '#22c55e',
  working: '#3b82f6',
  idle: '#9ca3af',
  // Accent
  accent: '#2563eb',
  accentDark: '#6ea8fe',
  // Mark
  tile: '#1c1f26',
  edge: '#3a404c',
  bar: '#ececf0',
  // Popup, dark theme
  popBg: '#242428',
  popFg: '#ececf0',
  popMuted: '#a3a3ad',
  popFaint: '#75757f',
  popLine: 'rgba(255,255,255,.09)',
  popHover: 'rgba(255,255,255,.065)',
  popPress: 'rgba(255,255,255,.11)',
  popChip: 'rgba(255,255,255,.075)',
  needsText: '#fbbf24',
  errorText: '#f87171',
  doneText: '#4ade80',
  // Marketing surfaces
  desk: '#16181d',
  night: '#121418',
  paper: '#ececf0',
  muted: '#a3a3ad',
  faint: '#75757f',
};

export {FPS} from './timeline';

export type Layout = 'landscape' | 'portrait';

export type SessionState = 'needs' | 'error' | 'done' | 'working' | 'idle' | 'ended';

export const STATE_COLOR: Record<SessionState, string> = {
  needs: C.needs,
  error: C.error,
  done: C.done,
  working: C.working,
  idle: C.idle,
  ended: 'transparent',
};

export const DISCLAIMER = 'Unofficial. Not affiliated with or endorsed by Anthropic.';
export const REPO_URL = 'github.com/drknowhow/claude-sessions';
