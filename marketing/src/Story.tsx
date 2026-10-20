// The promo. One small desktop (the stage) is driven frame by frame from timeline.ts;
// the landscape and portrait cuts frame the same stage with the captions beside or above it.
import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {C, F, Layout, REPO_URL} from './theme';
import {K, ROW_STEP, SCENES, TERM_STEP} from './timeline';
import {Key, lerp, path2, pop, ramp, window01} from './lib/anim';
import {Backdrop, Disclaimer, Lockup, Mark, Wordmark} from './components/brand';
import {Cam, Cursor, StageFrame, Taskbar, Toast, TrayIconState, Wallpaper, camTransform, tray} from './components/desktop';
import {CARD_W, PICKER_H, Popup, backCenter, chipLabelCenter, chipPlayCenter, listHeight, rowCenter} from './components/popup';
import {ShopStage, Terminal, TLine, apiLines, docsLines, inventoryLines, mobileFailedLines, shopLines} from './components/terminal';
import {CAPTIONS, PICKER, PROMO_HEAD, PROMO_ROWS, TAGLINE_END} from './data';

// ------------------------------------------------------------ stage geometry

export const SW = 1090;
export const SH = 940;
const ZOOM = 2; // popup css px -> stage px
const PERIOD = 48; // working-dot pulse

const G = tray(SW, SH);
const POP_LEFT = SW - G.popupRight - CARD_W * ZOOM;
const LIST_H = listHeight(PROMO_ROWS.length);
const LIST_TOP = SH - G.popupBottom - LIST_H * ZOOM;
const PICK_TOP = SH - G.popupBottom - PICKER_H * ZOOM;

const inList = (p: {x: number; y: number}) => ({x: POP_LEFT + p.x * ZOOM, y: LIST_TOP + p.y * ZOOM});
const ICON = {x: G.icon.x + 2, y: G.icon.y + 2};
const CHIP = K.chips.map((_, i) => inList(chipPlayCenter(i)));
const LABEL0 = inList(chipLabelCenter(0));
const BACK = {x: POP_LEFT + backCenter.x * ZOOM, y: PICK_TOP + backCenter.y * ZOOM};
const ROW0 = {x: POP_LEFT + (rowCenter(0).x - 20) * ZOOM, y: inList(rowCenter(0)).y};

// ------------------------------------------------------------ terminals

type Win = {key: string; title: string; lines?: TLine[]};
const WINS: Win[] = [
  {key: 'shop', title: 'C:\\dev\\shop'},
  {key: 'mobile', title: 'C:\\dev\\mobile-app', lines: mobileFailedLines},
  {key: 'api', title: 'C:\\dev\\api', lines: apiLines},
  {key: 'inv', title: 'C:\\dev\\inventory', lines: inventoryLines},
  {key: 'docs', title: 'C:\\dev\\docs-site', lines: docsLines},
];
const winPos = (i: number) => ({x: 36 + i * 56, y: 36 + i * 70});

const shopState = (f: number): {stage: ShopStage; flash: number; label: string} => {
  const secs = `(${Math.floor((f - K.answer) / 30) + 1}s)`;
  if (f < K.answer) return {stage: 'ask', flash: window01(f, K.keyPress - 2, K.answer + 2, 2, 4), label: ''};
  if (f < K.testsPass) return {stage: 'answered', flash: 0, label: secs};
  if (f < K.finished) return {stage: 'passing', flash: 0, label: secs};
  return {stage: 'finished', flash: 0, label: ''};
};

const Terminals: React.FC<{f: number}> = ({f}) => {
  const focusS2 = ramp(f, K.slideAside, K.slideAside + 24) * (1 - ramp(f, K.slideBack, K.slideBack + 22));
  const shopOnTop = (f >= K.slideAside && f < K.slideBack) || f >= K.front;
  return (
    <>
      {WINS.map((w, i) => {
        const appear = ramp(f, K.termIn + i * TERM_STEP, K.termIn + i * TERM_STEP + 14, Easing.out(Easing.cubic));
        const p = winPos(i);
        let x = p.x;
        let y = p.y + (1 - appear) * 30;
        let scale = 0.97 + 0.03 * appear;
        let opacity = appear;
        let lift = 0;
        if (i === 0) {
          x = lerp(x, 120, focusS2);
          y = lerp(y, 150, focusS2);
          scale *= lerp(1, 1.1, focusS2);
          lift = Math.max(0.6 * focusS2, window01(f, K.front, K.front + 80, 10, 30));
        } else {
          const aside = ramp(f, K.slideAside + 3 * i, K.slideAside + 24 + 3 * i) * (1 - ramp(f, K.slideBack + 2 * i, K.slideBack + 22 + 2 * i));
          x += 1000 * aside;
          opacity *= 1 - 0.7 * aside;
        }
        const s = shopState(f);
        const lines = i === 0 ? shopLines(s.stage, s.flash, s.label) : w.lines!;
        const z = i === 0 && shopOnTop ? 10 : i + 1;
        const focused = i === 0 ? shopOnTop : i === WINS.length - 1 && !shopOnTop;
        return (
          <Terminal
            key={w.key}
            title={w.title}
            lines={lines}
            x={x}
            y={y}
            scale={scale}
            opacity={opacity}
            z={z}
            frame={f}
            period={PERIOD}
            focused={focused}
            lift={lift}
          />
        );
      })}
    </>
  );
};

/** "Waiting 6:00" pill under the shop window in scene 2. */
const WaitTimer: React.FC<{f: number}> = ({f}) => {
  const vis = window01(f, K.timerStart, K.slideBack + 7, 10, 10);
  if (vis <= 0) return null;
  const sec =
    f < K.timerFastEnd
      ? Math.floor(360 * ramp(f, K.timerStart, K.timerFastEnd, Easing.out(Easing.cubic)))
      : 360 + Math.floor((f - K.timerFastEnd) / 30);
  const label = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  return (
    <div
      style={{
        position: 'absolute',
        right: SW - 934,
        top: 692,
        zIndex: 20,
        opacity: vis,
        transform: `translateY(${(1 - vis) * 12}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 24px 12px 20px',
        borderRadius: 999,
        background: 'rgba(245,158,11,0.12)',
        border: '1.5px solid rgba(245,158,11,0.5)',
        fontFamily: F.body,
        fontSize: 28,
        fontWeight: 600,
        color: C.needsText,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span style={{width: 14, height: 14, borderRadius: '50%', background: C.needs, boxShadow: '0 0 0 5px rgba(245,158,11,.22)'}} />
      <span>Waiting</span>
      <span style={{minWidth: 62}}>{label}</span>
    </div>
  );
};

// ------------------------------------------------------------ tray icon, camera, cursor

const promoIcon = (f: number): TrayIconState => {
  if (f < K.iconIn) return {kind: 'none', color: C.working, scale: 1, rings: []};
  if (f < K.needs) return {kind: 'dot', color: C.working, scale: pop(f, K.iconIn), rings: []};
  if (f < K.working)
    return {
      kind: 'square',
      color: C.needs,
      n: 1,
      scale: 0.6 + 0.4 * pop(f, K.needs),
      rings: [K.needs, K.needs + 20].map((c) => ({t: (f - c) / 24, color: C.needs})),
    };
  if (f < K.finished) return {kind: 'dot', color: C.working, scale: 0.6 + 0.4 * pop(f, K.working), rings: []};
  return {kind: 'square', color: C.done, n: 1, scale: 0.6 + 0.4 * pop(f, K.finished), rings: [{t: (f - K.finished) / 24, color: C.done}]};
};

const promoCam = (f: number): Cam => {
  const zt = ramp(f, K.zoomIn, K.zoomInEnd) * (1 - ramp(f, K.zoomOut, K.zoomOutEnd));
  if (zt > 0) return {z: 1 + 1.2 * zt, cx: SW, cy: SH};
  const pt = ramp(f, K.pushIn, K.pushInEnd) * (1 - ramp(f, K.pushOut, K.pushOutEnd));
  return {z: 1 + 0.25 * pt, cx: lerp(SW / 2, 654, pt), cy: lerp(SH / 2, 476, pt)};
};

// [start, end, x, y]: glide to (x, y) between the two frames.
const MOVES: [number, number, number, number][] = [
  [K.cursorIn, K.hoverIcon, ICON.x, ICON.y],
  ...K.chips.map((c, i): [number, number, number, number] => [i === 0 ? 528 : K.chips[i - 1] + 5, c - 2, CHIP[i].x, CHIP[i].y]),
  [652, K.pickerClick - 2, LABEL0.x, LABEL0.y],
  [704, K.pickerBack - 4, BACK.x, BACK.y],
  [752, K.rowHover - 2, ROW0.x, ROW0.y],
  [846, 880, 1010, 300],
];
const CURSOR_KEYS: Key[] = (() => {
  const keys: Key[] = [{f: K.cursorIn, x: 560, y: 560}];
  for (const [a, b, x, y] of MOVES) {
    const last = keys[keys.length - 1];
    if (a > last.f) keys.push({f: a, x: last.x, y: last.y});
    keys.push({f: b, x, y});
  }
  return keys;
})();
const CLICKS = [...K.chips, K.pickerClick, K.pickerBack, K.rowClick];

const PromoCursor: React.FC<{f: number}> = ({f}) => {
  const opacity = ramp(f, K.cursorIn, K.cursorIn + 8) * (1 - ramp(f, 866, 880));
  if (opacity <= 0) return null;
  const p = path2(f, CURSOR_KEYS);
  const press = Math.max(...CLICKS.map((c) => window01(f, c - 3, c + 4, 3, 4)));
  const c = CLICKS.find((k) => f >= k && f < k + 14);
  return <Cursor x={p.x} y={p.y} press={press} ripple={c === undefined ? 0 : (f - c) / 14} opacity={opacity} />;
};

// ------------------------------------------------------------ popup

const PromoPopup: React.FC<{f: number}> = ({f}) => {
  const open = ramp(f, K.popupOpen, K.popupOpen + 10, Easing.out(Easing.cubic)) * (1 - ramp(f, K.popupClose, K.popupClose + 5));
  if (open <= 0) return null;
  const view = ramp(f, K.pickerClick + 1, K.pickerClick + 11) * (1 - ramp(f, K.pickerBack + 1, K.pickerBack + 11));
  const fx = (i: number) => {
    const at = K.rowsIn + i * ROW_STEP;
    const e = {
      appear: ramp(f, at, at + 10, Easing.out(Easing.cubic)),
      hover: 0,
      press: 0,
      lit: 0,
      ring: 0,
      playPress: 0,
      labelHover: 0,
    };
    if (i < K.chips.length) {
      const c = K.chips[i];
      e.hover = window01(f, c - 3, c + 20, 3, 4);
      e.lit = window01(f, c, c + 20, 2, 8);
      e.ring = f >= c && f < c + 18 ? (f - c) / 18 : 0;
      e.playPress = window01(f, c - 2, c + 4, 2, 3);
    }
    if (i === 0) {
      e.labelHover = window01(f, K.pickerClick - 6, K.pickerClick + 4, 4, 3);
      e.hover = Math.max(e.hover, e.labelHover, window01(f, K.rowHover - 4, K.popupClose + 6, 4, 2));
      e.press = window01(f, K.rowClick - 3, K.rowClick + 6, 3, 4);
    }
    return e;
  };
  return (
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
        title={PROMO_HEAD.title}
        counts={PROMO_HEAD.counts}
        top="needs"
        rows={PROMO_ROWS}
        frame={f}
        period={PERIOD}
        fx={fx}
        view={view}
        picker={PICKER}
        backHover={window01(f, K.pickerBack - 8, K.pickerBack + 4, 4, 3)}
        zoom={ZOOM}
        height={lerp(LIST_H, PICKER_H, view)}
      />
    </div>
  );
};

// ------------------------------------------------------------ the stage

const SHOP_NAME = PROMO_ROWS[0].name!;

export const PromoStage: React.FC<{f: number}> = ({f}) => {
  const cam = promoCam(f);
  const needsToast = ramp(f, K.needsToast, K.needsToast + 14, Easing.out(Easing.cubic)) * (1 - ramp(f, K.needsToastOut, K.needsToastOut + 12));
  const doneToast = ramp(f, K.finished, K.finished + 14, Easing.out(Easing.cubic));
  return (
    <div style={{position: 'absolute', inset: 0, transform: camTransform(SW, SH, cam), transformOrigin: '0 0'}}>
      <Wallpaper />
      <Terminals f={f} />
      <WaitTimer f={f} />
      <div style={{position: 'absolute', inset: 0, zIndex: 25}}>
        <Taskbar W={SW} H={SH} icon={promoIcon(f)} iconHover={window01(f, K.hoverIcon - 4, 532, 4, 4)} />
        {needsToast > 0 ? (
          <Toast
            W={SW}
            H={SH}
            t={needsToast}
            title="shop · checkout needs you"
            lines={[SHOP_NAME, 'Claude needs your permission to use Bash']}
          />
        ) : null}
        {doneToast > 0 ? (
          <Toast W={SW} H={SH} t={doneToast} title="shop · checkout finished" lines={[SHOP_NAME, 'All 48 tests pass. Tax now rounds per line.']} />
        ) : null}
      </div>
      <PromoPopup f={f} />
      <PromoCursor f={f} />
    </div>
  );
};

// ------------------------------------------------------------ captions and end card

const Captions: React.FC<{f: number; size: number; align: 'left' | 'center'}> = ({f, size, align}) => (
  <div style={{display: 'grid', alignItems: 'center', justifyItems: align === 'left' ? 'start' : 'center', height: '100%'}}>
    {CAPTIONS.map((text, i) => {
      const s = SCENES[i];
      // Out, then in: the old line is gone at the cut, so two captions never overlap.
      const a = i === 0 ? 4 : s.from;
      const b = i === CAPTIONS.length - 1 ? K.end : s.from + s.dur;
      const v = window01(f, a, b, 10, 8);
      if (v <= 0) return null;
      const rising = ramp(f, a, a + 14, Easing.out(Easing.cubic));
      return (
        <div
          key={i}
          style={{
            gridArea: '1 / 1',
            opacity: v,
            transform: `translateY(${(1 - rising) * 14}px)`,
            fontFamily: F.display,
            fontWeight: 700,
            fontSize: size,
            lineHeight: 1.12,
            letterSpacing: '-0.02em',
            color: C.paper,
            textAlign: align,
            textWrap: 'balance',
          }}
        >
          {text}
        </div>
      );
    })}
  </div>
);

const EndCard: React.FC<{f: number; layout: Layout}> = ({f, layout}) => {
  const t = ramp(f, K.end - 5, K.end + 13, Easing.out(Easing.cubic));
  if (t <= 0) return null;
  const late = ramp(f, K.end + 8, K.end + 26, Easing.out(Easing.cubic));
  const portrait = layout === 'portrait';
  return (
    <AbsoluteFill style={{opacity: t, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `translateY(${(1 - t) * 18}px)`}}>
        <div style={{transform: `scale(${0.85 + 0.15 * pop(f, K.end, 16)})`}}>
          <Mark size={portrait ? 220 : 168} />
        </div>
        <div style={{marginTop: portrait ? 56 : 44}}>
          <Wordmark size={portrait ? 104 : 92} />
        </div>
        <div
          style={{
            marginTop: portrait ? 34 : 26,
            maxWidth: portrait ? 860 : 1200,
            textAlign: 'center',
            fontFamily: F.body,
            fontSize: portrait ? 42 : 36,
            lineHeight: 1.35,
            color: C.muted,
            opacity: late,
            textWrap: 'balance',
          }}
        >
          {portrait
            ? TAGLINE_END.split(/(?<=\.) /).map((s) => (
                <div key={s}>{s}</div>
              ))
            : TAGLINE_END}
        </div>
        <div style={{marginTop: portrait ? 44 : 34, fontFamily: F.body, fontWeight: 500, fontSize: portrait ? 38 : 32, color: C.accentDark, opacity: late}}>
          {REPO_URL}
        </div>
      </div>
      <Disclaimer
        size={portrait ? 26 : 22}
        style={{position: 'absolute', bottom: portrait ? 150 : 56, left: 0, right: 0, textAlign: 'center', opacity: late}}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------ composition

export const Promo: React.FC<{layout: Layout}> = ({layout}) => {
  const f = useCurrentFrame();
  const out = 1 - ramp(f, K.stageOut, K.end);
  const portrait = layout === 'portrait';
  const scale = portrait ? 1000 / SW : 1;
  const stage = (
    <StageFrame
      W={SW}
      H={SH}
      radius={28}
      style={{
        left: portrait ? 40 : 750,
        top: portrait ? 880 : 70,
        transform: `scale(${scale})`,
        transformOrigin: '0 0',
        opacity: out,
      }}
    >
      <PromoStage f={f} />
    </StageFrame>
  );
  return (
    <AbsoluteFill>
      <Backdrop />
      {out > 0 ? (
        portrait ? (
          <>
            <div style={{position: 'absolute', top: 160, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: out}}>
              <Lockup size={60} />
            </div>
            <div style={{position: 'absolute', left: 70, width: 940, top: 290, height: 540, opacity: out}}>
              <Captions f={f} size={72} align="center" />
            </div>
            {stage}
          </>
        ) : (
          <>
            <div style={{position: 'absolute', left: 110, top: 96, opacity: out}}>
              <Lockup size={48} />
            </div>
            <div style={{position: 'absolute', left: 110, width: 560, top: 200, height: 680, opacity: out}}>
              <Captions f={f} size={56} align="left" />
            </div>
            {stage}
          </>
        )
      ) : null}
      <EndCard f={f} layout={layout} />
    </AbsoluteFill>
  );
};
