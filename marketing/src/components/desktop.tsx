// A generic dark desktop at 2x: wallpaper, taskbar, tray icon, toast, cursor.
// Nothing here copies Windows or Anthropic branding; it only suggests the shape.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from '../theme';
import {Mark} from './brand';

export const TASKBAR_H = 96;

/** Tray geometry, measured from the stage's bottom-right corner. */
export const tray = (W: number, H: number) => ({
  icon: {x: W - 378, y: H - 48},
  popupRight: 24,
  popupBottom: 120,
  toastRight: 24,
  toastBottom: 120,
});

// ------------------------------------------------------------ camera

export type Cam = {z: number; cx: number; cy: number};

/** Transform that puts (cx, cy) at the centre at zoom z, kept inside the stage. */
export const camTransform = (W: number, H: number, cam: Cam) => {
  const z = Math.max(1, cam.z);
  const hw = W / (2 * z);
  const hh = H / (2 * z);
  const cx = Math.min(W - hw, Math.max(hw, cam.cx));
  const cy = Math.min(H - hh, Math.max(hh, cam.cy));
  return `translate(${W / 2 - cx * z}px, ${H / 2 - cy * z}px) scale(${z})`;
};

// ------------------------------------------------------------ wallpaper

export const Wallpaper: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: '#171a21',
      backgroundImage: [
        'radial-gradient(900px 700px at 30% 26%, rgba(59,130,246,0.10), rgba(23,26,33,0) 70%)',
        'radial-gradient(800px 600px at 85% 90%, rgba(110,168,254,0.05), rgba(23,26,33,0) 70%)',
        'linear-gradient(160deg, #1d2230 0%, #171a21 55%, #14161b 100%)',
      ].join(', '),
    }}
  />
);

// ------------------------------------------------------------ taskbar

const glyph: React.CSSProperties = {display: 'block'};

const TermGlyph: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={glyph}>
    <rect x="2" y="3.5" width="20" height="17" rx="3.5" fill="#2b2f38" stroke="#4a505c" strokeWidth="1" />
    <path d="M6.5 9l3 3-3 3" fill="none" stroke="#e6e7ea" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11.5 15.5h5" stroke="#e6e7ea" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const FolderGlyph: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={glyph}>
    <path d="M2.5 7.2c0-1.2.9-2.1 2.1-2.1h4.3l2 2h8.5c1.2 0 2.1.9 2.1 2.1v8.6c0 1.2-.9 2.1-2.1 2.1H4.6c-1.2 0-2.1-.9-2.1-2.1z" fill="#3a3f4a" stroke="#565c69" strokeWidth="1" />
  </svg>
);

const GlobeGlyph: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={glyph}>
    <circle cx="12" cy="12" r="9" fill="#2f343e" stroke="#565c69" strokeWidth="1" />
    <path d="M3.5 12h17M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18" fill="none" stroke="#7d8391" strokeWidth="1" />
  </svg>
);

const SearchGlyph: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={glyph}>
    <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="#c9cbd1" strokeWidth="1.8" />
    <path d="M15 15l5 5" stroke="#c9cbd1" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const SysGlyphs: React.FC = () => {
  const s = {fill: 'none', stroke: '#e6e7ea', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
      {/* wifi */}
      <svg width={28} height={28} viewBox="0 0 24 24" style={glyph}>
        <path d="M3 9.5a13 13 0 0 1 18 0M6 12.8a8.6 8.6 0 0 1 12 0M9 16a4.2 4.2 0 0 1 6 0" {...s} />
        <circle cx="12" cy="19" r="1.3" fill="#e6e7ea" />
      </svg>
      {/* speaker */}
      <svg width={28} height={28} viewBox="0 0 24 24" style={glyph}>
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" {...s} />
        <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" {...s} />
      </svg>
      {/* battery */}
      <svg width={30} height={28} viewBox="0 0 26 24" style={glyph}>
        <rect x="2" y="7" width="19" height="10" rx="2.5" {...s} />
        <rect x="4.2" y="9.2" width="11" height="5.6" rx="1" fill="#e6e7ea" />
        <path d="M23.5 10.2v3.6" {...s} />
      </svg>
    </div>
  );
};

/** The tray icon, drawn on the same 32 px grid as tray-icon.js. */
export type TrayKind = 'none' | 'ring' | 'dot' | 'square';

// Only the digit the videos show, copied from tray-icon.js. Add others from there if needed.
const GLYPHS: Record<string, number[]> = {
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
};

export const TrayIconSvg: React.FC<{kind: TrayKind; color: string; n?: number; px: number}> = ({kind, color, n = 1, px}) => {
  const size = 32;
  if (kind === 'none') return null;
  const r = size * 0.34;
  let body: React.ReactNode = null;
  if (kind === 'ring') {
    const t = Math.max(1.5, size * 0.11);
    body = <circle cx={16} cy={16} r={r - t / 2} fill="none" stroke={color} strokeWidth={t} />;
  } else if (kind === 'dot') {
    body = <circle cx={16} cy={16} r={r} fill={color} />;
  } else {
    const text = String(n);
    const scale = Math.max(1, Math.floor(size / 16));
    const w = (text.length * 6 - 1) * scale;
    const h = 7 * scale;
    const x0 = Math.floor((size - w) / 2);
    const y0 = Math.floor((size - h) / 2);
    const px2: React.ReactNode[] = [];
    [...text].forEach((ch, ci) => {
      const rows = GLYPHS[ch] ?? GLYPHS['1'];
      rows.forEach((bits, row) => {
        for (let col = 0; col < 5; col++) {
          if (bits & (1 << (4 - col))) {
            px2.push(
              <rect key={`${ci}-${row}-${col}`} x={x0 + (ci * 6 + col) * scale} y={y0 + row * scale} width={scale} height={scale} fill="#fff" />,
            );
          }
        }
      });
    });
    body = (
      <>
        <rect x={0} y={0} width={size} height={size} rx={size * 0.22} fill={color} />
        <g shapeRendering="crispEdges">{px2}</g>
      </>
    );
  }
  return (
    <svg width={px} height={px} viewBox="0 0 32 32" style={{display: 'block', overflow: 'visible'}}>
      {body}
    </svg>
  );
};

export type TrayIconState = {
  kind: TrayKind;
  color: string;
  n?: number;
  scale: number; // pop
  rings: {t: number; color: string}[]; // 0..1 expanding attention rings
};

export const Taskbar: React.FC<{W: number; H: number; icon: TrayIconState; termActive?: boolean; iconHover?: number}> = ({
  W,
  H,
  icon,
  termActive = true,
  iconHover = 0,
}) => {
  const g = tray(W, H);
  const center = W * 0.42;
  const apps = [
    {k: 'search', el: <SearchGlyph size={40} />},
    {k: 'files', el: <FolderGlyph size={44} />},
    {k: 'web', el: <GlobeGlyph size={42} />},
    {k: 'term', el: <TermGlyph size={44} />, active: termActive},
  ];
  return (
    <div style={{position: 'absolute', left: 0, top: H - TASKBAR_H, width: W, height: TASKBAR_H}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(28,30,36,0.94)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      />
      {/* app icons */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: center - (apps.length * 80) / 2,
          height: TASKBAR_H,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {apps.map((a) => (
          <div
            key={a.k}
            style={{
              position: 'relative',
              width: 72,
              height: 72,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: a.active ? 'rgba(255,255,255,0.06)' : undefined,
            }}
          >
            {a.el}
            {a.active ? (
              <div style={{position: 'absolute', bottom: 3, left: 26, width: 20, height: 5, borderRadius: 3, background: '#9aa0ab'}} />
            ) : null}
          </div>
        ))}
      </div>
      {/* chevron */}
      <div
        style={{
          position: 'absolute',
          left: W - 466,
          top: 20,
          width: 44,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={22} height={22} viewBox="0 0 16 16" style={glyph}>
          <path d="M3.5 10l4.5-4.5 4.5 4.5" fill="none" stroke="#e6e7ea" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {/* our icon */}
      <div
        style={{
          position: 'absolute',
          left: g.icon.x - 36,
          top: 12,
          width: 72,
          height: 72,
          borderRadius: 10,
          background: iconHover ? `rgba(255,255,255,${0.07 * iconHover})` : undefined,
        }}
      />
      {icon.rings.map((r, i) =>
        r.t > 0 && r.t < 1 ? (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: g.icon.x - 16 - r.t * 26,
              top: TASKBAR_H / 2 - 16 - r.t * 26,
              width: 32 + r.t * 52,
              height: 32 + r.t * 52,
              borderRadius: 12 + r.t * 20,
              border: `3px solid ${r.color}`,
              opacity: 0.7 * (1 - r.t),
              boxSizing: 'border-box',
            }}
          />
        ) : null,
      )}
      <div
        style={{
          position: 'absolute',
          left: g.icon.x - 16,
          top: TASKBAR_H / 2 - 16,
          width: 32,
          height: 32,
          transform: `scale(${icon.scale})`,
        }}
      >
        <TrayIconSvg kind={icon.kind} color={icon.color} n={icon.n} px={32} />
      </div>
      {/* system pill */}
      <div
        style={{
          position: 'absolute',
          left: W - 330,
          top: 14,
          width: 150,
          height: 68,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SysGlyphs />
      </div>
      {/* clock */}
      <div
        style={{
          position: 'absolute',
          left: W - 172,
          top: 0,
          width: 156,
          height: TASKBAR_H,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingRight: 12,
          boxSizing: 'border-box',
          fontFamily: F.body,
          fontSize: 22,
          lineHeight: 1.3,
          color: '#e6e7ea',
        }}
      >
        <div>10:24 AM</div>
        <div>6/12/2026</div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------ toast

export const Toast: React.FC<{W: number; H: number; t: number; title: string; lines: string[]}> = ({W, H, t, title, lines}) => {
  const g = tray(W, H);
  const width = 728;
  return (
    <div
      style={{
        position: 'absolute',
        right: g.toastRight,
        bottom: g.toastBottom,
        width,
        transform: `translateX(${(1 - t) * (width + 60)}px)`,
        opacity: Math.min(1, t * 1.6),
        boxSizing: 'border-box',
        padding: '26px 32px 30px',
        background: '#2b2c31',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 16,
        boxShadow: '0 16px 48px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.3)',
        fontFamily: F.body,
        color: '#ececf0',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 21, color: '#a3a3ad'}}>
        <Mark size={30} />
        <div style={{flex: 1}}>Claude Sessions</div>
        <svg width={20} height={20} viewBox="0 0 16 16" style={glyph}>
          <path d="M4 4l8 8M12 4l-8 8" stroke="#a3a3ad" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{marginTop: 20, fontSize: 26, fontWeight: 600, lineHeight: 1.3}}>{title}</div>
      {lines.map((l) => (
        <div key={l} style={{marginTop: 6, fontSize: 24, color: '#b8b8c1', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
          {l}
        </div>
      ))}
    </div>
  );
};

// ------------------------------------------------------------ cursor

export const Cursor: React.FC<{x: number; y: number; press?: number; ripple?: number; opacity?: number}> = ({
  x,
  y,
  press = 0,
  ripple = 0,
  opacity = 1,
}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, opacity, zIndex: 50}}>
    {ripple > 0 && ripple < 1 ? (
      <div
        style={{
          position: 'absolute',
          left: -(10 + ripple * 26),
          top: -(10 + ripple * 26),
          width: 2 * (10 + ripple * 26),
          height: 2 * (10 + ripple * 26),
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.85)',
          opacity: 1 - ripple,
          boxSizing: 'border-box',
        }}
      />
    ) : null}
    <svg
      width={30}
      height={44}
      viewBox="0 0 24 35"
      style={{position: 'absolute', left: -2, top: -2, transform: `scale(${1 - press * 0.12})`, transformOrigin: '2px 2px', overflow: 'visible', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.45))'}}
    >
      <path d="M1.5 1.5v26.2l6.6-6.3 4.4 10.1 4.6-2-4.4-10h9z" fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  </div>
);

/** Background tint that every scene shares behind the stage. */
export const StageFrame: React.FC<{W: number; H: number; radius?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  W,
  H,
  radius = 28,
  children,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      width: W,
      height: H,
      borderRadius: radius,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
      background: C.desk,
      ...style,
    }}
  >
    {children}
  </div>
);
