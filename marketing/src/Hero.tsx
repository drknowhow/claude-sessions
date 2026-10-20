// README GIF: the icon turns amber, the popup opens, a click on the needs-you row
// brings its terminal forward, the prompt is answered and the icon goes back to blue.
// Every animated value returns to its frame-0 state by HERO_DUR, so the GIF loops.
import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {C} from './theme';
import {H, HERO_DUR} from './timeline';
import {Key, path2, pop, ramp, window01} from './lib/anim';
import {Cursor, Taskbar, TrayIconState, Wallpaper, tray} from './components/desktop';
import {CARD_W, Popup, listHeight, rowCenter} from './components/popup';
import {Terminal, TLine, docsLines, inventoryLines, mobileWorkingLines, shopLines} from './components/terminal';
import {HERO_HEAD, HERO_ROWS} from './data';

const W = 1600;
const HH = 900;
const ZOOM = 2;
const PERIOD = 45; // divides HERO_DUR, so pulses loop cleanly

const G = tray(W, HH);
const POP_LEFT = W - G.popupRight - CARD_W * ZOOM;
const LIST_TOP = HH - G.popupBottom - listHeight(HERO_ROWS.length) * ZOOM;
const ROW0 = {x: POP_LEFT + (rowCenter(0).x - 20) * ZOOM, y: LIST_TOP + rowCenter(0).y * ZOOM};
const ICON = {x: G.icon.x + 2, y: G.icon.y + 2};
// Inside the docs-site window but clear of the shop window, so the closing click
// refocuses docs-site and the last frame matches the first.
const HOME = {x: 900, y: 610};

const pos = (i: number) => ({x: 70 + i * 70, y: 60 + i * 80});
const BACK: {title: string; lines: (f: number) => TLine[]}[] = [
  {title: 'C:\\dev\\shop', lines: (f) => shopLines(f < H.needs || f >= H.reset ? 'before' : 'ask')},
  {title: 'C:\\dev\\mobile-app', lines: () => mobileWorkingLines},
  {title: 'C:\\dev\\inventory', lines: () => inventoryLines},
  {title: 'C:\\dev\\docs-site', lines: () => docsLines},
];

const heroIcon = (f: number): TrayIconState => {
  if (f < H.needs) return {kind: 'dot', color: C.working, scale: 1, rings: []};
  if (f < H.working)
    return {
      kind: 'square',
      color: C.needs,
      n: 1,
      scale: 0.6 + 0.4 * pop(f, H.needs),
      rings: [H.needs, H.needs + 20].map((c) => ({t: (f - c) / 24, color: C.needs})),
    };
  return {kind: 'dot', color: C.working, scale: 0.6 + 0.4 * pop(f, H.working), rings: []};
};

const CURSOR_KEYS: Key[] = [
  {f: 0, ...HOME},
  {f: H.cursorGo, ...HOME},
  {f: H.cursorAtIcon, ...ICON},
  {f: 100, ...ICON},
  {f: 122, ...ROW0},
  {f: H.cursorBack, ...ROW0},
  {f: H.cursorHome, ...HOME},
];

const HeroStage: React.FC<{f: number}> = ({f}) => {
  const open = ramp(f, H.popupOpen, H.popupOpen + 8, Easing.out(Easing.cubic)) * (1 - ramp(f, H.popupClose, H.popupClose + 8));
  // Windows raise instantly on a click, so the shop copy drops out in one frame at the reset click.
  const front = f < H.reset ? ramp(f, H.front, H.front + 8) : 0;
  const shopFront = shopLines(
    f < H.answer ? 'ask' : 'answered',
    window01(f, H.keyPress - 2, H.answer + 2, 2, 4),
    `(${Math.max(1, Math.floor((f - H.answer) / 30) + 1)}s)`,
  );
  const clicks = [H.rowClick, H.reset];
  const press = Math.max(...clicks.map((c) => window01(f, c - 3, c + 4, 3, 4)));
  const c = clicks.find((k) => f >= k && f < k + 14);
  const ripple = c === undefined ? 0 : (f - c) / 14;
  const cur = path2(f, CURSOR_KEYS);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: HH, overflow: 'hidden', transform: 'scale(1.6)', transformOrigin: '0 0'}}>
      <Wallpaper />
      {BACK.map((b, i) => (
        <Terminal
          key={b.title}
          title={b.title}
          lines={b.lines(f)}
          {...pos(i)}
          z={i + 1}
          frame={f}
          period={PERIOD}
          focused={i === BACK.length - 1 && front < 0.5}
        />
      ))}
      {front > 0 ? (
        <Terminal
          title="C:\dev\shop"
          lines={shopFront}
          {...pos(0)}
          opacity={front}
          z={10}
          frame={f}
          period={PERIOD}
          focused
          lift={window01(f, H.front, H.reset, 8, 1)}
        />
      ) : null}
      <div style={{position: 'absolute', inset: 0, zIndex: 25}}>
        <Taskbar W={W} H={HH} icon={heroIcon(f)} iconHover={window01(f, 64, 104, 4, 4)} />
      </div>
      {open > 0 ? (
        <div
          style={{
            position: 'absolute',
            right: G.popupRight,
            bottom: G.popupBottom,
            zIndex: 30,
            opacity: open,
            transform: `translateY(${(1 - open) * 16}px) scale(${0.98 + 0.02 * open})`,
            transformOrigin: 'bottom right',
          }}
        >
          <Popup
            title={HERO_HEAD.title}
            counts={HERO_HEAD.counts}
            top="needs"
            rows={HERO_ROWS}
            frame={f}
            period={PERIOD}
            zoom={ZOOM}
            fx={(i) => ({
              appear: ramp(f, H.rowsIn + 4 * i, H.rowsIn + 10 + 4 * i, Easing.out(Easing.cubic)),
              hover: i === 0 ? window01(f, 120, 156, 4, 2) : 0,
              press: i === 0 ? window01(f, H.rowClick - 3, H.rowClick + 4, 3, 4) : 0,
            })}
          />
        </div>
      ) : null}
      <Cursor x={cur.x} y={cur.y} press={press} ripple={ripple} />
    </div>
  );
};

export const Hero: React.FC = () => {
  const f = useCurrentFrame() % HERO_DUR;
  return (
    <AbsoluteFill style={{backgroundColor: C.desk}}>
      <HeroStage f={f} />
    </AbsoluteFill>
  );
};
