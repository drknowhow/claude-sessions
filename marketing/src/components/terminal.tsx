// Generic dark terminal windows with Claude Code-style transcripts.
// No starburst spinner: a working turn shows a pulsing blue dot.
import React from 'react';
import {C, F} from '../theme';
import {pulse} from '../lib/anim';

export const TERM_W = 740;
export const TERM_H = 470;
const TAB_H = 56;
const LINE = 27;
const FS = 19;

const T = {
  body: '#101216',
  bar: '#1b1e24',
  text: '#d4d4d8',
  dim: '#7c7f88',
  faint: '#4b4f58',
  green: '#4ade80',
  red: '#f87171',
  amber: '#fbbf24',
};

export type TLine =
  | {k: 'prompt'; text: string}
  | {k: 'tool'; name: string; arg: string; state?: 'ok' | 'pending' | 'running'}
  | {k: 'result'; text: string}
  | {k: 'say'; text: string}
  | {k: 'error'; text: string}
  | {k: 'gap'}
  | {k: 'ask'; flash: number}
  | {k: 'working'; label: string}
  | {k: 'input'};

const Bullet: React.FC<{color: string; opacity?: number}> = ({color, opacity = 1}) => (
  <span style={{display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, opacity, margin: '0 14px 0 2px', flex: 'none'}} />
);

const Elbow: React.FC = () => (
  <span
    style={{
      display: 'inline-block',
      width: 12,
      height: 12,
      borderLeft: `2px solid ${T.faint}`,
      borderBottom: `2px solid ${T.faint}`,
      margin: '0 14px 6px 24px',
      flex: 'none',
    }}
  />
);

const Line: React.FC<{l: TLine; frame: number; period: number}> = ({l, frame, period}) => {
  const row: React.CSSProperties = {display: 'flex', alignItems: 'center', height: LINE, whiteSpace: 'pre', overflow: 'hidden'};
  switch (l.k) {
    case 'prompt':
      return (
        <div style={{...row, color: T.dim}}>
          <span style={{marginRight: 12}}>{'>'}</span>
          <span style={{color: '#b9bac0'}}>{l.text}</span>
        </div>
      );
    case 'tool': {
      const col = l.state === 'pending' ? T.dim : l.state === 'running' ? C.working : T.green;
      const op = l.state === 'running' ? pulse(frame, period) : 1;
      return (
        <div style={{...row, color: T.text}}>
          <Bullet color={col} opacity={op} />
          <span style={{fontWeight: 700}}>{l.name}</span>
          <span>{`(${l.arg})`}</span>
        </div>
      );
    }
    case 'result':
      return (
        <div style={{...row, color: T.dim}}>
          <Elbow />
          <span>{l.text}</span>
        </div>
      );
    case 'say':
      return (
        <div style={{...row, color: T.text}}>
          <Bullet color={T.text} />
          <span>{l.text}</span>
        </div>
      );
    case 'error':
      return (
        <div style={{...row, color: T.red}}>
          <Elbow />
          <span>{l.text}</span>
        </div>
      );
    case 'gap':
      return <div style={{height: 12}} />;
    case 'ask':
      return (
        <div
          style={{
            margin: '8px 0 0',
            padding: '10px 18px 12px',
            border: '1.5px solid rgba(245,158,11,0.55)',
            borderRadius: 10,
          }}
        >
          <div style={{...row, color: T.text}}>Do you want to run this command?</div>
          <div
            style={{
              ...row,
              color: C.accentDark,
              margin: '4px -8px 0',
              padding: '0 8px',
              borderRadius: 6,
              background: l.flash ? `rgba(110,168,254,${0.28 * l.flash})` : undefined,
            }}
          >
            {'> 1. Yes'}
          </div>
          <div style={{...row, color: T.dim}}>{'  2. No'}</div>
        </div>
      );
    case 'working':
      return (
        <div style={{...row, color: '#9ec3ff'}}>
          <Bullet color={C.working} opacity={pulse(frame, period)} />
          <span>Working…</span>
          <span style={{color: T.dim}}>{` ${l.label}`}</span>
        </div>
      );
    case 'input':
      return (
        <div
          style={{
            ...row,
            height: 46,
            marginTop: 12,
            padding: '0 14px',
            border: `1.5px solid ${T.faint}`,
            borderRadius: 10,
            color: T.dim,
          }}
        >
          <span style={{marginRight: 12}}>{'>'}</span>
          <span style={{width: 11, height: 22, background: '#9a9da6', opacity: Math.floor(frame / 15) % 2 ? 0.25 : 0.9}} />
        </div>
      );
    default:
      return null;
  }
};

export type TermProps = {
  title: string;
  lines: TLine[];
  x: number;
  y: number;
  scale?: number;
  opacity?: number;
  z: number;
  frame: number;
  period: number;
  focused?: boolean;
  /** Extra lift, 0..1 (shadow and a small scale-up when the window comes forward). */
  lift?: number;
};

export const Terminal: React.FC<TermProps> = ({title, lines, x, y, scale = 1, opacity = 1, z, frame, period, focused, lift = 0}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: TERM_W,
      height: TERM_H,
      zIndex: z,
      opacity,
      transform: `scale(${scale * (1 + 0.025 * lift)})`,
      transformOrigin: '0 0',
      borderRadius: 14,
      overflow: 'hidden',
      background: T.body,
      border: `1px solid ${focused ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.09)'}`,
      boxShadow: `0 ${18 + lift * 14}px ${48 + lift * 30}px rgba(0,0,0,${0.5 + lift * 0.1})`,
      fontFamily: F.mono,
      fontSize: FS,
      boxSizing: 'border-box',
    }}
  >
    {/* tab bar */}
    <div style={{height: TAB_H, background: T.bar, display: 'flex', alignItems: 'flex-end', position: 'relative'}}>
      <div
        style={{
          marginLeft: 12,
          width: 300,
          height: 42,
          background: T.body,
          borderRadius: '10px 10px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          boxSizing: 'border-box',
          fontFamily: F.body,
          fontSize: 18,
          color: '#d8d9de',
        }}
      >
        <span style={{fontFamily: F.mono, fontSize: 16, color: '#9a9da6', fontWeight: 700}}>{'>_'}</span>
        <span style={{flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{title}</span>
        <svg width={14} height={14} viewBox="0 0 16 16">
          <path d="M4 4l8 8M12 4l-8 8" stroke="#7c7f88" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{height: 42, display: 'flex', alignItems: 'center', gap: 18, marginLeft: 16, color: '#8a8d96', fontFamily: F.body, fontSize: 22}}>
        <span>+</span>
        <svg width={14} height={14} viewBox="0 0 16 16">
          <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="#8a8d96" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {/* window controls */}
      <div style={{position: 'absolute', right: 0, top: 0, height: 44, display: 'flex'}}>
        {[
          <path key="min" d="M3 8h10" stroke="#b5b7be" strokeWidth="1.2" />,
          <rect key="max" x="3.5" y="3.5" width="9" height="9" rx="1.5" fill="none" stroke="#b5b7be" strokeWidth="1.2" />,
          <path key="x" d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="#b5b7be" strokeWidth="1.2" />,
        ].map((p, i) => (
          <div key={i} style={{width: 62, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <svg width={16} height={16} viewBox="0 0 16 16">
              {p}
            </svg>
          </div>
        ))}
      </div>
    </div>
    {/* transcript */}
    <div style={{padding: '18px 26px 0'}}>
      {lines.map((l, i) => (
        <Line key={i} l={l} frame={frame} period={period} />
      ))}
    </div>
  </div>
);

// ------------------------------------------------------------ transcripts

export type ShopStage = 'before' | 'ask' | 'answered' | 'passing' | 'finished';

/** shop · checkout, the session that needs you. */
export const shopLines = (stage: ShopStage, flash = 0, workingLabel = '(3s)'): TLine[] => {
  const head: TLine[] = [
    {k: 'prompt', text: 'Fix the tax rounding on the checkout page'},
    {k: 'gap'},
    {k: 'tool', name: 'Read', arg: 'src/cart.js'},
    {k: 'result', text: 'Read 142 lines'},
    {k: 'gap'},
    {k: 'tool', name: 'Update', arg: 'src/cart.js'},
    {k: 'result', text: 'Updated src/cart.js with 3 additions'},
    {k: 'gap'},
  ];
  switch (stage) {
    case 'before':
      return [...head, {k: 'tool', name: 'Bash', arg: 'npm test', state: 'pending'}];
    case 'ask':
      return [...head, {k: 'tool', name: 'Bash', arg: 'npm test', state: 'pending'}, {k: 'ask', flash}];
    case 'answered':
      return [...head, {k: 'tool', name: 'Bash', arg: 'npm test', state: 'running'}, {k: 'gap'}, {k: 'working', label: workingLabel}];
    case 'passing':
      return [
        ...head,
        {k: 'tool', name: 'Bash', arg: 'npm test'},
        {k: 'result', text: '48 passing (2.1s)'},
        {k: 'gap'},
        {k: 'working', label: workingLabel},
      ];
    case 'finished':
      return [
        ...head,
        {k: 'tool', name: 'Bash', arg: 'npm test'},
        {k: 'result', text: '48 passing (2.1s)'},
        {k: 'gap'},
        {k: 'say', text: 'All 48 tests pass. Tax now rounds per line.'},
        {k: 'input'},
      ];
  }
};

export const mobileFailedLines: TLine[] = [
  {k: 'prompt', text: 'Bump the SDK and rebuild the release'},
  {k: 'gap'},
  {k: 'tool', name: 'Update', arg: 'package.json'},
  {k: 'result', text: 'Updated package.json with 1 addition'},
  {k: 'gap'},
  {k: 'tool', name: 'Bash', arg: 'npm run build:release'},
  {k: 'error', text: 'Error: API overloaded (529)'},
  {k: 'input'},
];

export const mobileWorkingLines: TLine[] = [
  {k: 'prompt', text: 'Bump the SDK and rebuild the release'},
  {k: 'gap'},
  {k: 'tool', name: 'Update', arg: 'package.json'},
  {k: 'result', text: 'Updated package.json with 1 addition'},
  {k: 'gap'},
  {k: 'tool', name: 'Bash', arg: 'npm run build:release', state: 'running'},
  {k: 'gap'},
  {k: 'working', label: '(2m)'},
];

export const apiLines: TLine[] = [
  {k: 'prompt', text: 'Split the auth middleware into smaller pieces'},
  {k: 'gap'},
  {k: 'tool', name: 'Update', arg: 'src/auth/index.js'},
  {k: 'result', text: 'Updated src/auth/index.js with 4 additions'},
  {k: 'gap'},
  {k: 'say', text: 'Done. 2 background tasks still running.'},
  {k: 'input'},
];

export const inventoryLines: TLine[] = [
  {k: 'prompt', text: 'Why does the order total drift by a cent?'},
  {k: 'gap'},
  {k: 'say', text: 'Totals are summed as floats. Store cents.'},
  {k: 'input'},
];

export const docsLines: TLine[] = [
  {k: 'prompt', text: 'Add a search box to the docs sidebar'},
  {k: 'gap'},
  {k: 'tool', name: 'Read', arg: 'src/Sidebar.tsx'},
  {k: 'result', text: 'Read 88 lines'},
  {k: 'gap'},
  {k: 'tool', name: 'Edit', arg: 'src/Sidebar.tsx', state: 'running'},
  {k: 'gap'},
  {k: 'working', label: '(6m)'},
];
