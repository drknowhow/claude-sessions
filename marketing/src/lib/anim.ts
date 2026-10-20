import {Easing, interpolate} from 'remotion';

const CL = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 0 before `a`, 1 after `b`, eased in between. */
export const ramp = (f: number, a: number, b: number, ease: (t: number) => number = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], {...CL, easing: ease});

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Rises over [a, a+inF], holds, falls over [b-outF, b]. */
export const window01 = (f: number, a: number, b: number, inF = 8, outF = 8) =>
  Math.min(ramp(f, a, a + inF, Easing.out(Easing.cubic)), 1 - ramp(f, b - outF, b, Easing.in(Easing.cubic)));

/** A short pop: 0 → 1 with a small overshoot. */
export const pop = (f: number, at: number, len = 12) => {
  const t = Math.max(0, Math.min(1, (f - at) / len));
  return Easing.out(Easing.back(1.8))(t);
};

/** Opacity pulse 1 → .45 → 1 with the given period, like the app's working dot. */
export const pulse = (f: number, period: number) => {
  const t = (((f % period) + period) % period) / period;
  return 1 - 0.55 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2));
};

/** Piecewise path through keyed points, eased per segment. */
export type Key = {f: number; x: number; y: number};
export const path2 = (f: number, keys: Key[]) => {
  if (f <= keys[0].f) return {x: keys[0].x, y: keys[0].y};
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (f <= b.f) {
      const t = ramp(f, a.f, b.f);
      return {x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t)};
    }
  }
  const z = keys[keys.length - 1];
  return {x: z.x, y: z.y};
};
