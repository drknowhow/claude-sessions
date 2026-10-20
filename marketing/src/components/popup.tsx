// The tray popup, rebuilt from renderer/popup.css and popup.html (dark theme).
// Every size here is in the app's CSS pixels; the wrapper applies `zoom`.
import React from 'react';
import {C, F, SessionState, STATE_COLOR} from '../theme';
import {pulse} from '../lib/anim';

export type RowData = {
  key: string;
  state: SessionState;
  where: string;
  name?: string;
  line: string;
  sound?: string; // chip label; omitted for ended rows
  muted?: boolean;
};

export type PickerData = {
  forText: string;
  project: string;
  current: string;
};

const SOUNDS = ['Marimba', 'Bell', 'Wood', 'Blip', 'Chirp', 'Pluck', 'Glass', 'Low horn'];

// ------------------------------------------------------------ geometry (css px)

const BORDER = 1;
const HEAD_H = 10 + 9 + 13 * 1.35 + 12 * 1.35 + 1; // padding + title + counts + border
const ROWS_PAD = 4;
const ROW_H = 7 + 7 + 12 * 1.35 + 11.5 * 1.35 + 1;
export const CARD_W = 320;

export const listHeight = (rows: number) => BORDER * 2 + HEAD_H + ROWS_PAD * 2 + rows * ROW_H;
export const PICKER_H = BORDER * 2 + HEAD_H + (8 + 2 * 2 + 24) + (4 + (8 + 3 + 11 * 1.35) + SOUNDS.length * 28 + 6);

/** Centre of row i's text, from the card's top-left corner. */
export const rowCenter = (i: number) => ({x: 120, y: BORDER + HEAD_H + ROWS_PAD + i * ROW_H + ROW_H / 2});
/** Centre of row i's play button, from the card's top-left corner. */
export const chipPlayCenter = (i: number) => ({x: CARD_W - (BORDER + ROWS_PAD + 4 + 22 + 9 + 11), y: rowCenter(i).y});
/** Roughly the centre of row i's chip label (the sound name). */
export const chipLabelCenter = (i: number, labelW = 58) => ({
  x: CARD_W - (BORDER + ROWS_PAD + 4 + 22 + 9 + 22 + labelW / 2),
  y: rowCenter(i).y,
});
export const backCenter = {x: BORDER + 6 + 13, y: BORDER + 10 + 16.5};

// ------------------------------------------------------------ icons

const stroke: React.CSSProperties = {
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  display: 'block',
};

export const BellIcon: React.FC = () => (
  <svg viewBox="0 0 16 16" style={stroke}>
    <path d="M8 2.2a3.6 3.6 0 0 0-3.6 3.6v2.4L3.2 10.6h9.6L11.6 8.2V5.8A3.6 3.6 0 0 0 8 2.2zM6.6 12.4a1.4 1.4 0 0 0 2.8 0" />
  </svg>
);

export const GearIcon: React.FC = () => (
  <svg viewBox="0 0 16 16" style={stroke}>
    <circle cx="8" cy="8" r="2.1" />
    <path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.15 1.15M11.25 11.25l1.15 1.15M3.6 12.4l1.15-1.15M11.25 4.75l1.15-1.15" />
  </svg>
);

const BackIcon: React.FC = () => (
  <svg viewBox="0 0 16 16" style={stroke}>
    <path d="M10 3L5 8l5 5" />
  </svg>
);

const PlayIcon: React.FC<{color?: string}> = ({color}) => (
  <svg viewBox="0 0 10 10" style={{width: 10, height: 10, fill: color ?? 'currentColor', display: 'block'}}>
    <path d="M2.4 1.3v7.4L8.7 5z" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg
    viewBox="0 0 14 14"
    style={{width: 14, height: 14, fill: 'none', stroke: C.accentDark, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', display: 'block'}}
  >
    <path d="M3 7.4l2.6 2.6L11 4.4" />
  </svg>
);

const MoreDots: React.FC = () => (
  <svg viewBox="0 0 22 24" style={{width: 22, height: 24, display: 'block'}}>
    {[6, 11, 16].map((x) => (
      <circle key={x} cx={x} cy={12.5} r={1.15} fill={C.popFaint} />
    ))}
  </svg>
);

const MuteIcon: React.FC = () => (
  <svg
    viewBox="0 0 12 12"
    style={{width: 11, height: 11, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', flex: 'none', display: 'block'}}
  >
    <path d="M1.5 4.6h2l3-2.4v7.6l-3-2.4h-2zM8.4 4.6l2.8 2.8M11.2 4.6L8.4 7.4" />
  </svg>
);

// ------------------------------------------------------------ pieces

export const Dot: React.FC<{state: SessionState; frame: number; period: number; size?: number}> = ({state, frame, period, size = 9}) => {
  const base: React.CSSProperties = {flex: 'none', width: size, height: size, borderRadius: '50%', boxSizing: 'border-box'};
  if (state === 'ended') return <span style={{...base, background: 'transparent', border: `1.5px solid ${C.popFaint}`}} />;
  return (
    <span
      style={{
        ...base,
        background: STATE_COLOR[state],
        boxShadow: state === 'needs' ? '0 0 0 3px rgba(245,158,11,.22)' : undefined,
        opacity: state === 'working' ? pulse(frame, period) : 1,
      }}
    />
  );
};

const lineColor = (s: SessionState) =>
  s === 'needs' ? C.needsText : s === 'error' ? C.errorText : s === 'done' ? C.doneText : C.popMuted;

const ellipsis: React.CSSProperties = {whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'};

type RowFx = {
  appear: number; // 0..1
  hover: number; // 0..1 row hover
  press: number; // 0..1 row press
  lit: number; // 0..1 chip highlight
  ring: number; // 0..1 chip ring expansion progress (0 = none)
  playPress: number; // 0..1
  labelHover: number; // 0..1
};

const Row: React.FC<{r: RowData; fx: RowFx; frame: number; period: number}> = ({r, fx, frame, period}) => {
  const dimmed = r.state === 'ended';
  const bg = fx.press > 0 ? `rgba(255,255,255,${0.11 * fx.press + 0.065 * (1 - fx.press)})` : `rgba(255,255,255,${0.065 * fx.hover})`;
  const litBg = `rgba(110,168,254,${0.2 * fx.lit})`;
  const chipColor = fx.lit > 0.01 ? mixHex(C.popMuted, C.accentDark, fx.lit) : C.popMuted;
  const ringAlpha = fx.ring > 0 && fx.ring < 1 ? 0.55 * (1 - fx.ring) : 0;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 4px 7px 8px',
        borderRadius: 7,
        background: bg,
        opacity: (dimmed ? 0.55 : 1) * fx.appear,
        transform: `translateY(${(1 - fx.appear) * 10}px)`,
      }}
    >
      <Dot state={r.state} frame={frame} period={period} />
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{...ellipsis, color: C.popFg}}>
          <span style={{fontWeight: 600}}>{r.where}</span>
          {r.name ? <span style={{color: C.popMuted}}>{` · ${r.name}`}</span> : null}
        </div>
        <div style={{...ellipsis, color: lineColor(r.state), fontSize: 11.5, marginTop: 1}}>{r.line}</div>
      </div>
      {r.sound && !dimmed ? (
        <div
          style={{
            flex: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            height: 22,
            borderRadius: 11,
            background: fx.lit > 0.01 ? litBg : C.popChip,
            color: chipColor,
            fontSize: 11,
            maxWidth: 116,
            boxShadow: ringAlpha ? `0 0 0 ${2 + fx.ring * 9}px rgba(110,168,254,${ringAlpha})` : undefined,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: '100%',
              padding: '0 4px 0 9px',
              borderRadius: '11px 0 0 11px',
              minWidth: 0,
              background: fx.labelHover ? `rgba(255,255,255,${0.065 * fx.labelHover})` : undefined,
              color: fx.labelHover ? C.popFg : undefined,
            }}
          >
            {r.muted ? <MuteIcon /> : null}
            <span style={{...ellipsis, textDecoration: r.muted ? 'line-through' : undefined}}>{r.sound}</span>
          </span>
          <span
            style={{
              flex: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: '100%',
              borderRadius: '0 11px 11px 0',
              background: fx.playPress ? `rgba(255,255,255,${0.11 * fx.playPress})` : undefined,
            }}
          >
            <PlayIcon />
          </span>
        </div>
      ) : (
        <span style={{flex: 'none', width: 0}} />
      )}
      <span style={{flex: 'none', width: 22, height: 24, borderRadius: 5}}>
        <MoreDots />
      </span>
    </div>
  );
};

const Head: React.FC<{children: React.ReactNode; sub?: boolean}> = ({children, sub}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: sub ? '10px 8px 9px 6px' : '10px 8px 9px 12px',
      borderBottom: `1px solid ${C.popLine}`,
    }}
  >
    {children}
  </div>
);

const IconBtn: React.FC<{children: React.ReactNode; hover?: number}> = ({children, hover = 0}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      height: 26,
      minWidth: 26,
      padding: '0 5px',
      borderRadius: 6,
      color: hover ? C.popFg : C.popMuted,
      background: hover ? `rgba(255,255,255,${0.065 * hover})` : undefined,
      boxSizing: 'border-box',
    }}
  >
    {children}
  </span>
);

// ------------------------------------------------------------ popup

export type PopupProps = {
  title: string;
  counts: string;
  top: SessionState;
  rows: RowData[];
  frame: number;
  period: number;
  /** Per-row effects; anything left out is 0 (or 1 for appear). */
  fx?: (i: number) => Partial<RowFx>;
  /** 0 = list, 1 = picker. */
  view?: number;
  picker?: PickerData;
  backHover?: number;
  zoom: number;
  /** Card height in css px; leave out to fit the content. */
  height?: number;
};

export const Popup: React.FC<PopupProps> = ({title, counts, top, rows, frame, period, fx, view = 0, picker, backHover = 0, zoom, height}) => {
  const showPicker = view >= 0.5 && picker;
  const contentOpacity = showPicker ? (view - 0.5) * 2 : 1 - view * 2;
  return (
    <div style={{zoom}}>
      <div
        style={{
          width: CARD_W,
          height,
          boxSizing: 'border-box',
          background: C.popBg,
          border: `1px solid ${C.popLine}`,
          borderRadius: 10,
          overflow: 'hidden',
          fontFamily: F.body,
          fontSize: 12,
          lineHeight: 1.35,
          // Inter sets about 8% wider than the app's Segoe UI; tighten so rows fit like the app.
          letterSpacing: '-0.02em',
          color: C.popFg,
          boxShadow: '0 12px 32px rgba(0,0,0,.45), 0 2px 8px rgba(0,0,0,.35)',
        }}
      >
        <div style={{opacity: contentOpacity}}>
          {showPicker ? (
            <PickerView picker={picker!} backHover={backHover} />
          ) : (
            <>
              <Head>
                <Dot state={top} frame={frame} period={period} />
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap'}}>{title}</div>
                  <div style={{...ellipsis, color: C.popMuted}}>{counts}</div>
                </div>
                <IconBtn>
                  <BellIcon />
                </IconBtn>
                <IconBtn>
                  <GearIcon />
                </IconBtn>
              </Head>
              <div style={{padding: ROWS_PAD}}>
                {rows.map((r, i) => {
                  const e = fx ? fx(i) : {};
                  return (
                    <Row
                      key={r.key}
                      r={r}
                      frame={frame}
                      period={period}
                      fx={{
                        appear: e.appear ?? 1,
                        hover: e.hover ?? 0,
                        press: e.press ?? 0,
                        lit: e.lit ?? 0,
                        ring: e.ring ?? 0,
                        playPress: e.playPress ?? 0,
                        labelHover: e.labelHover ?? 0,
                      }}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const PickerView: React.FC<{picker: PickerData; backHover: number}> = ({picker, backHover}) => (
  <>
    <Head sub>
      <IconBtn hover={backHover}>
        <BackIcon />
      </IconBtn>
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap'}}>Sound</div>
        <div style={{...ellipsis, color: C.popMuted}}>{picker.forText}</div>
      </div>
      <span style={{color: C.accentDark, padding: '3px 6px', borderRadius: 5, whiteSpace: 'nowrap'}}>Add sound…</span>
    </Head>
    <div style={{display: 'flex', gap: 2, margin: '8px 10px 0', padding: 2, background: C.popChip, borderRadius: 7}}>
      {[
        {label: 'This session', on: false},
        {label: `All ${picker.project} sessions`, on: true},
      ].map((b) => (
        <span
          key={b.label}
          style={{
            flex: 1,
            height: 24,
            borderRadius: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 6px',
            ...ellipsis,
            color: b.on ? C.popFg : C.popMuted,
            background: b.on ? C.popBg : undefined,
            boxShadow: b.on ? `0 0 0 1px ${C.popLine}` : undefined,
          }}
        >
          {b.label}
        </span>
      ))}
    </div>
    <div style={{padding: '4px 4px 6px'}}>
      <div style={{color: C.popFaint, fontSize: 11, fontWeight: 600, padding: '8px 10px 3px'}}>Built-in</div>
      {SOUNDS.map((s) => {
        const cur = s === picker.current;
        return (
          <div
            key={s}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 6px 0 4px',
              borderRadius: 6,
              height: 28,
              background: cur ? C.popChip : undefined,
            }}
          >
            <span
              style={{
                flex: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: '50%',
                color: C.popMuted,
              }}
            >
              <PlayIcon />
            </span>
            <span style={{flex: 1}}>{s}</span>
            <span style={{width: 14, height: 14, flex: 'none', opacity: cur ? 1 : 0}}>
              <CheckIcon />
            </span>
          </div>
        );
      })}
    </div>
  </>
);

/** Linear blend of two #rrggbb colours. */
export function mixHex(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
