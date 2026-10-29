// The tray popup, rebuilt from renderer/popup.css, popup.html and popup.js (dark theme).
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
  agents?: AgentsData;
};

export type AgentState = 'running' | 'needs' | 'done' | 'failed' | 'stopped';

/** One subagent line (state.js agentText / agentTime); a running run's time can tick with the frame. */
export type AgentRun = {
  key: string;
  state: AgentState;
  type: string;
  text: string;
  time: string | ((frame: number) => string);
  depth?: number;
};

/** A row's subagent runs. The pill shows `count` in the colour of `tone`: live (running), needs or idle (all finished). */
export type AgentsData = {count: number; tone: 'live' | 'needs' | 'idle'; runs: AgentRun[]};

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
// A row is two lines: the title with its tools, then the state line with the sound chip.
// The 22px tools overhang the title line by 3px a side, so the title (16.2) sets its height;
// the 20px chip overhangs by 2px a side, so its 16px beats the 11.5px state line.
const ROW_PAD_Y = 7;
const TOP_H = 12 * 1.35;
const BOTTOM_GAP = 2;
const BOTTOM_H = 16;
const ROW_H = ROW_PAD_Y * 2 + TOP_H + BOTTOM_GAP + BOTTOM_H;
export const CARD_W = 320;
/** Right edge of a row's content: card border, list padding and row padding. */
const ROW_RIGHT = CARD_W - (BORDER + ROWS_PAD + 4);

const hasChip = (r: RowData) => !!r.sound && r.state !== 'ended';
// An ended row has no chip, so its bottom line is just the state line.
const rowHeight = (r: RowData) => (hasChip(r) ? ROW_H : ROW_H - BOTTOM_H + 11.5 * 1.35);

/** Height the open subagent list adds under its row: 5px over, a 20px line per run, 1px under. */
export const agentsHeight = (a: AgentsData) => 5 + a.runs.length * 20 + 1;

/** Card height for the list; `open(i)` is how far row i's subagent list is open, 0..1. */
export const listHeight = (rows: RowData[], open: (i: number) => number = () => 0) =>
  BORDER * 2 + HEAD_H + ROWS_PAD * 2 + rows.reduce((h, r, i) => h + rowHeight(r) + (r.agents ? agentsHeight(r.agents) * open(i) : 0), 0);
export const PICKER_H = BORDER * 2 + HEAD_H + (8 + 2 * 2 + 24) + (4 + (8 + 3 + 11 * 1.35) + SOUNDS.length * 28 + 6);

// Ended rows sort under the live ones, so every row above a live row is full height.
const rowTop = (i: number) => BORDER + HEAD_H + ROWS_PAD + i * ROW_H;
const topLineY = (i: number) => rowTop(i) + ROW_PAD_Y + TOP_H / 2;
const bottomLineY = (i: number) => rowTop(i) + ROW_PAD_Y + TOP_H + BOTTOM_GAP + BOTTOM_H / 2;

/** Centre of one of row i's title-line buttons (22px each, 1px apart, right-aligned). Copy and folder sit further left on a row with a subagent pill. */
export const toolCenter = (i: number, tool: 'copy' | 'folder' | 'expand' | 'more') => {
  const fromRight = {more: 0, expand: 1, folder: 2, copy: 3}[tool];
  return {x: ROW_RIGHT - 11 - fromRight * 23, y: topLineY(i)};
};
/** Row i's subagent pill, just left of its expand button: the centre of its chevron, so a cursor there leaves the count in view. */
export const agentsPillCenter = (i: number) => ({x: ROW_RIGHT - 2 * 23 - 3 - 4.5, y: topLineY(i)});
/** Centre of row i's play button, from the card's top-left corner. */
export const chipPlayCenter = (i: number) => ({x: ROW_RIGHT - 11, y: bottomLineY(i)});
/** Roughly the centre of row i's chip label (the sound name). */
export const chipLabelCenter = (i: number, labelW = 42) => ({x: ROW_RIGHT - 22 - 4 - labelW / 2, y: bottomLineY(i)});
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

// The row's stroke icons, on the app's 16-unit grid (renderer/popup.js).
const SPEAKER = 'M2 6h2.5L8 3v10L4.5 10H2z';
const ROW_ICON = {
  copy: 'M4.5 6.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1zM2.5 10.5v-7a1 1 0 0 1 1-1h7',
  folder: 'M2 4.5a1 1 0 0 1 1-1h3.2l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z',
  expand: 'M10 2.5h3.5V6M13.5 2.5L9.5 6.5M6 13.5H2.5V10M2.5 13.5l4-4',
  more: 'M3.5 8h.01M8 8h.01M12.5 8h.01',
  soundOn: `${SPEAKER}M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.3 6.3 0 0 1 0 9`,
  soundOff: `${SPEAKER}M10.5 6l4 4M14.5 6l-4 4`,
  agents: 'M4 2.5v8a2 2 0 0 0 2 2h6.5M4 7h8.5',
  chevron: 'M6 4l4 4-4 4',
};

const RowIcon: React.FC<{d: string; size: number; weight: number}> = ({d, size, weight}) => (
  <svg viewBox="0 0 16 16" style={{...stroke, width: size, height: size, strokeWidth: weight}}>
    <path d={d} />
  </svg>
);

// ------------------------------------------------------------ pieces

// A subagent line's 7px dot has a thinner ring and border (popup.css .agent .dot).
export const Dot: React.FC<{state: SessionState; frame: number; period: number; size?: number}> = ({state, frame, period, size = 9}) => {
  const small = size < 9;
  const base: React.CSSProperties = {flex: 'none', width: size, height: size, borderRadius: '50%', boxSizing: 'border-box'};
  if (state === 'ended') return <span style={{...base, background: 'transparent', border: `${small ? 1.2 : 1.5}px solid ${C.popFaint}`}} />;
  return (
    <span
      style={{
        ...base,
        background: STATE_COLOR[state],
        boxShadow: state === 'needs' ? `0 0 0 ${small ? 2 : 3}px rgba(245,158,11,.22)` : undefined,
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
  reveal: number; // 0..1 copy and folder buttons; the app shows them while the row is hovered
  expandHover: number; // 0..1
  expandPress: number; // 0..1
  agentsOpen: number; // 0..1 subagent list
  agentsHover: number; // 0..1
  agentsPress: number; // 0..1
};

/** Hover and press fill for a button, the app's --hover and --press. */
const fill = (hover: number, press = 0) =>
  press > 0 ? `rgba(255,255,255,${0.11 * press + 0.065 * (1 - press)})` : hover > 0 ? `rgba(255,255,255,${0.065 * hover})` : undefined;

const Tool: React.FC<{d: string; color: string; hover?: number; press?: number; opacity?: number; weight?: number}> = ({
  d,
  color,
  hover = 0,
  press = 0,
  opacity = 1,
  weight = 1.5,
}) => (
  <span
    style={{
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 22,
      height: 22,
      borderRadius: 5,
      color: hover || press ? mixHex(color, C.popFg, Math.max(hover, press)) : color,
      background: fill(hover, press),
      opacity,
    }}
  >
    <RowIcon d={d} size={14} weight={weight} />
  </span>
);

const Row: React.FC<{r: RowData; fx: RowFx; frame: number; period: number}> = ({r, fx, frame, period}) => {
  const dimmed = r.state === 'ended';
  const bg = fill(fx.hover, fx.press);
  const litBg = `rgba(110,168,254,${0.2 * fx.lit})`;
  const chipColor = fx.lit > 0.01 ? mixHex(C.popMuted, C.accentDark, fx.lit) : C.popMuted;
  const ringAlpha = fx.ring > 0 && fx.ring < 1 ? 0.55 * (1 - fx.ring) : 0;
  const line: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 6};
  return (
    <div
      style={{
        padding: `${ROW_PAD_Y}px 4px ${ROW_PAD_Y}px 8px`,
        borderRadius: 7,
        background: bg,
        opacity: (dimmed ? 0.55 : 1) * fx.appear,
        transform: `translateY(${(1 - fx.appear) * 10}px)`,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 9}}>
        <Dot state={r.state} frame={frame} period={period} />
        <div style={{flex: 1, minWidth: 0}}>
          <div style={line}>
            <div style={{...ellipsis, flex: 1, minWidth: 0, color: C.popFg}}>
              <span style={{fontWeight: 600}}>{r.where}</span>
              {r.name ? <span style={{color: C.popMuted}}>{` · ${r.name}`}</span> : null}
            </div>
            <div style={{flex: 'none', display: 'flex', alignItems: 'center', gap: 1, margin: '-3px 0'}}>
              <Tool d={ROW_ICON.copy} color={C.popFaint} opacity={fx.reveal} />
              <Tool d={ROW_ICON.folder} color={C.popFaint} opacity={fx.reveal} />
              {r.agents && !dimmed ? <AgentsPill a={r.agents} open={fx.agentsOpen} hover={fx.agentsHover} press={fx.agentsPress} /> : null}
              {dimmed ? null : <Tool d={ROW_ICON.expand} color={C.popMuted} hover={fx.expandHover} press={fx.expandPress} />}
              <Tool d={ROW_ICON.more} color={C.popFaint} weight={2.2} />
            </div>
          </div>
          <div style={{...line, marginTop: BOTTOM_GAP}}>
            <div style={{...ellipsis, flex: 1, minWidth: 0, color: lineColor(r.state), fontSize: 11.5}}>{r.line}</div>
            {hasChip(r) ? (
              <div
                style={{
                  flex: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 20,
                  margin: '-2px 0',
                  borderRadius: 10,
                  background: fx.lit > 0.01 ? litBg : C.popChip,
                  color: chipColor,
                  fontSize: 11,
                  maxWidth: 128,
                  boxShadow: ringAlpha ? `0 0 0 ${2 + fx.ring * 9}px rgba(110,168,254,${ringAlpha})` : undefined,
                }}
              >
                <span
                  style={{
                    flex: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: '100%',
                    paddingLeft: 2,
                    boxSizing: 'border-box',
                    borderRadius: '10px 0 0 10px',
                  }}
                >
                  <RowIcon d={r.muted ? ROW_ICON.soundOff : ROW_ICON.soundOn} size={12} weight={1.4} />
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '100%',
                    padding: '0 4px 0 1px',
                    minWidth: 0,
                    background: fill(fx.labelHover),
                    color: fx.labelHover ? C.popFg : undefined,
                  }}
                >
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
                    borderRadius: '0 10px 10px 0',
                    background: fx.playPress ? `rgba(255,255,255,${0.11 * fx.playPress})` : undefined,
                  }}
                >
                  <PlayIcon />
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {r.agents && !dimmed && fx.agentsOpen > 0 ? <AgentList a={r.agents} open={fx.agentsOpen} frame={frame} period={period} /> : null}
    </div>
  );
};

// ------------------------------------------------------------ subagents (popup.css .agents-pill, .row-agents)

const AgentsPill: React.FC<{a: AgentsData; open: number; hover: number; press: number}> = ({a, open, hover, press}) => {
  // The live and needs colours outrank :hover in the app's CSS; only the grey pill lightens.
  const color = a.tone === 'live' ? C.working : a.tone === 'needs' ? C.needsText : mixHex(C.popFaint, C.popFg, Math.max(hover, press));
  const chipBg = open > 0 ? `rgba(255,255,255,${0.075 * open})` : undefined;
  return (
    <span
      style={{
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        height: 22,
        padding: '0 3px 0 4px',
        borderRadius: 5,
        color,
        background: chipBg ?? fill(hover, press),
        fontSize: 11,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <RowIcon d={ROW_ICON.agents} size={13} weight={1.5} />
      <span>{a.count}</span>
      <span style={{display: 'inline-flex', transform: `rotate(${90 * open}deg)`}}>
        <RowIcon d={ROW_ICON.chevron} size={9} weight={1.8} />
      </span>
    </span>
  );
};

const AGENT_DOT: Record<AgentState, SessionState> = {running: 'working', needs: 'needs', done: 'done', failed: 'error', stopped: 'ended'};

const AgentList: React.FC<{a: AgentsData; open: number; frame: number; period: number}> = ({a, open, frame, period}) => (
  <div style={{height: agentsHeight(a) * open, overflow: 'hidden', opacity: open}}>
    <div style={{margin: '5px 0 1px 18px', paddingLeft: 8, borderLeft: `1px solid ${C.popLine}`}}>
      {a.runs.map((run) => {
        const finished = run.state === 'done' || run.state === 'stopped' || run.state === 'failed';
        return (
          <div
            key={run.key}
            style={{display: 'flex', alignItems: 'center', gap: 6, height: 20, paddingLeft: 12 * (run.depth ?? 0), fontSize: 11.5, color: C.popMuted}}
          >
            <Dot state={AGENT_DOT[run.state]} frame={frame} period={period} size={7} />
            <span
              style={{
                ...ellipsis,
                flex: 'none',
                maxWidth: 96,
                color: finished ? C.popMuted : C.popFg,
                fontWeight: finished ? 500 : 600,
                fontSize: 11,
              }}
            >
              {run.type}
            </span>
            <span style={{...ellipsis, flex: 1, minWidth: 0}}>{run.text}</span>
            <span
              style={{
                flex: 'none',
                paddingRight: 3,
                color: run.state === 'needs' ? C.needsText : run.state === 'failed' ? C.errorText : C.popFaint,
                fontSize: 11,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {typeof run.time === 'function' ? run.time(frame) : run.time}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

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
  /** Card height in css px; leave out to fit the content. A list taller than this scrolls, at the top. */
  height?: number;
};

export const Popup: React.FC<PopupProps> = ({title, counts, top, rows, frame, period, fx, view = 0, picker, backHover = 0, zoom, height}) => {
  const showPicker = view >= 0.5 && picker;
  const contentOpacity = showPicker ? (view - 0.5) * 2 : 1 - view * 2;
  const full = listHeight(rows, (i) => (fx ? fx(i).agentsOpen ?? 0 : 0));
  const scrolls = height !== undefined && view === 0 && height < full - 1;
  return (
    <div style={{zoom}}>
      <div
        style={{
          position: 'relative',
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
                        reveal: e.reveal ?? Math.max(e.hover ?? 0, e.press ?? 0),
                        expandHover: e.expandHover ?? 0,
                        expandPress: e.expandPress ?? 0,
                        agentsOpen: e.agentsOpen ?? 0,
                        agentsHover: e.agentsHover ?? 0,
                        agentsPress: e.agentsPress ?? 0,
                      }}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
        {scrolls ? <ScrollThumb visible={height! - BORDER * 2 - HEAD_H} content={full - BORDER * 2 - HEAD_H} /> : null}
      </div>
    </div>
  );
};

/** The rows' scrollbar thumb at scroll 0: an 8px track whose thumb is inset 2px (popup.css scrollbars). */
const ScrollThumb: React.FC<{visible: number; content: number}> = ({visible, content}) => (
  <div
    style={{
      position: 'absolute',
      top: HEAD_H + 2,
      right: 2,
      width: 4,
      height: (visible * visible) / content - 4,
      borderRadius: 2,
      background: C.popPress,
    }}
  />
);

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
