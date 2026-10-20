// Fixture sessions shown in the popup. Wording follows the app's own rules
// (state.js stateLine / rowLabel, view.js countsText).
import type {RowData} from './components/popup';

export const PROMO_ROWS: RowData[] = [
  {key: 'shop', state: 'needs', where: 'shop · checkout', name: 'Fix the tax rounding on the checkout page', line: 'Needs permission: Bash · 6m', sound: 'Marimba'},
  {key: 'mobile', state: 'error', where: 'mobile-app · main', line: 'Error: API overloaded (529)', sound: 'Glass'},
  {key: 'api', state: 'done', where: 'api · refactor', name: 'Split the auth middleware into smaller pieces', line: 'Done 2m ago · 2 background tasks', sound: 'Wood'},
  {key: 'docs', state: 'working', where: 'docs-site · search', name: 'Add a search box to the docs sidebar', line: 'Working 6m · Edit', sound: 'Blip'},
  {key: 'inv', state: 'idle', where: 'inventory', name: 'Why does the order total drift by a cent?', line: 'Idle 41m', sound: 'Chirp'},
  {key: 'bench', state: 'ended', where: 'benchmarks · nightly', line: 'Ended 3m ago'},
];

// The brief's header line. The app itself would go on with ", 1 working, 1 idle" and
// ellipsize at this width (see its own list-dark screenshot); the short form reads cleaner.
export const PROMO_HEAD = {title: '5 sessions', counts: '1 needs you, 1 failed, 1 done'};

export const HERO_ROWS: RowData[] = [
  {key: 'shop', state: 'needs', where: 'shop · checkout', name: 'Fix the tax rounding on the checkout page', line: 'Needs permission: Bash · 1m', sound: 'Marimba'},
  {key: 'docs', state: 'working', where: 'docs-site · search', name: 'Add a search box to the docs sidebar', line: 'Working 6m · Edit', sound: 'Blip'},
  {key: 'mobile', state: 'working', where: 'mobile-app · main', name: 'Bump the SDK and rebuild the release', line: 'Working 2m · Bash', sound: 'Glass'},
  {key: 'inv', state: 'idle', where: 'inventory', name: 'Why does the order total drift by a cent?', line: 'Idle 41m', sound: 'Chirp'},
  {key: 'bench', state: 'ended', where: 'benchmarks · nightly', line: 'Ended 3m ago'},
];

export const HERO_HEAD = {title: '4 sessions', counts: '1 needs you, 2 working, 1 idle'};

export const PICKER = {forText: 'shop · checkout · Fix the tax rounding on the checkout page', project: 'shop', current: 'Marimba'};

export const CAPTIONS = [
  'Five Claude Code sessions. Five terminal tabs.',
  'One has been waiting on you for six minutes.',
  'Claude Sessions sits in your tray and tells you.',
  'Hover for every session, most urgent first.',
  'Each project plays its own sound, so you can tell them apart without looking.',
  'Click a row to jump to its terminal.',
  'A toast and a chime when a turn finishes, fails or needs you.',
];

export const TAGLINE_END = 'A tray app for Claude Code on Windows. Free and open source.';
export const TAGLINE_SHORT = 'Know which Claude Code session needs you.';
