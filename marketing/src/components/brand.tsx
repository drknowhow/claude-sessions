import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, DISCLAIMER, F} from '../theme';

/** The app mark, from the same numbers as docs/brand/mark.svg (120-unit box). */
export const Mark: React.FC<{size: number; style?: React.CSSProperties}> = ({size, style}) => (
  <svg width={size} height={size} viewBox="0 0 120 120" style={{display: 'block', overflow: 'visible', ...style}}>
    <rect x="6" y="6" width="108" height="108" rx="26" fill={C.edge} />
    <rect x="9" y="9" width="102" height="102" rx="23" fill={C.tile} />
    <circle cx="35" cy="36" r="15" fill={C.needs} opacity={0.28} />
    <circle cx="35" cy="36" r="9.5" fill={C.needs} />
    <rect x="54" y="29.5" width="46" height="13" rx="6.5" fill={C.bar} />
    <circle cx="35" cy="60" r="9.5" fill={C.done} />
    <rect x="54" y="53.5" width="34" height="13" rx="6.5" fill={C.bar} opacity={0.5} />
    <circle cx="35" cy="84" r="9.5" fill={C.working} />
    <rect x="54" y="77.5" width="40" height="13" rx="6.5" fill={C.bar} opacity={0.5} />
  </svg>
);

export const Wordmark: React.FC<{size: number; color?: string; weight?: number}> = ({size, color = C.paper, weight = 700}) => (
  <div style={{fontFamily: F.display, fontWeight: weight, fontSize: size, color, letterSpacing: '-0.02em', lineHeight: 1, whiteSpace: 'nowrap'}}>
    Claude Sessions
  </div>
);

/** Mark plus name, side by side. */
export const Lockup: React.FC<{size: number; gap?: number; color?: string}> = ({size, gap, color}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: gap ?? size * 0.32}}>
    <Mark size={size} />
    <Wordmark size={size * 0.6} color={color} />
  </div>
);

/** Dark desk backdrop with a slow, faint blue glow. */
export const Backdrop: React.FC<{loop?: number}> = ({loop}) => {
  const f = useCurrentFrame();
  const a = loop ? (f / loop) * Math.PI * 2 : f / 90;
  const b = loop ? (f / loop) * Math.PI * 2 : f / 110;
  const x = 28 + Math.sin(a) * 8;
  const y = 18 + Math.cos(b) * 6;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.desk,
        backgroundImage: [
          `radial-gradient(1300px 950px at ${x}% ${y}%, rgba(59,130,246,0.085), rgba(22,24,29,0) 70%)`,
          'linear-gradient(180deg, #181a20 0%, #15171c 100%)',
        ].join(', '),
      }}
    />
  );
};

/** Fades a scene in and out at its edges so cuts never pop. */
export const SceneFade: React.FC<{dur: number; inF?: number; outF?: number; children: React.ReactNode}> = ({
  dur,
  inF = 8,
  outF = 8,
  children,
}) => {
  const f = useCurrentFrame();
  const a = inF > 0 ? interpolate(f, [0, inF], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  const b = outF > 0 ? interpolate(f, [dur - outF, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  return <AbsoluteFill style={{opacity: Math.min(a, b)}}>{children}</AbsoluteFill>;
};

export const Disclaimer: React.FC<{size: number; color?: string; style?: React.CSSProperties}> = ({size, color = C.faint, style}) => (
  <div style={{fontFamily: F.body, fontSize: size, color, letterSpacing: '0.005em', lineHeight: 1.3, ...style}}>{DISCLAIMER}</div>
);
