// Brand stills: the README banner and the GitHub social preview.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, F} from './theme';
import {Disclaimer, Lockup, Mark, Wordmark} from './components/brand';
import {Popup} from './components/popup';
import {PROMO_HEAD, PROMO_ROWS, TAGLINE_SHORT} from './data';

const META = 'Windows · free and open source · unofficial';

const glow = 'radial-gradient(900px 520px at 22% 30%, rgba(59,130,246,0.11), rgba(18,20,24,0) 70%)';

/** 1280x360, rendered at 2x. Transparent outside the rounded card. */
export const Banner: React.FC = () => (
  <AbsoluteFill>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: C.night,
        backgroundImage: glow,
        border: '1px solid rgba(255,255,255,0.07)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, paddingBottom: 8}}>
        <Mark size={168} />
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <Wordmark size={72} />
          <div style={{marginTop: 18, fontFamily: F.body, fontSize: 30, color: C.paper, opacity: 0.88}}>{TAGLINE_SHORT}</div>
          <div style={{marginTop: 14, fontFamily: F.body, fontSize: 22, color: C.muted}}>{META}</div>
        </div>
      </div>
      <Disclaimer size={16} style={{position: 'absolute', right: 28, bottom: 20}} />
    </div>
  </AbsoluteFill>
);

const SOCIAL_ROWS = PROMO_ROWS.map((r) => (r.key === 'shop' ? {...r, line: 'Needs permission: Bash · 1m'} : r));

/** 1280x640 GitHub social preview. */
export const SocialPreview: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.night, backgroundImage: glow}}>
    <div style={{position: 'absolute', left: 80, top: 0, bottom: 0, width: 600, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
      <Lockup size={104} gap={30} />
      <div style={{marginTop: 40, fontFamily: F.display, fontWeight: 600, fontSize: 40, lineHeight: 1.2, color: C.paper, letterSpacing: '-0.01em', maxWidth: 560}}>
        {TAGLINE_SHORT}
      </div>
      <div style={{marginTop: 22, fontFamily: F.body, fontSize: 24, color: C.muted}}>{META}</div>
    </div>
    <Disclaimer size={16} style={{position: 'absolute', left: 80, bottom: 40}} />
    <div style={{position: 'absolute', left: 736, top: 112}}>
      <Popup title={PROMO_HEAD.title} counts={PROMO_HEAD.counts} top="needs" rows={SOCIAL_ROWS} frame={0} period={48} zoom={1.5} />
    </div>
    <div
      style={{
        position: 'absolute',
        left: 700,
        right: 0,
        bottom: 0,
        height: 150,
        background: `linear-gradient(180deg, rgba(18,20,24,0) 0%, ${C.night} 88%)`,
      }}
    />
  </AbsoluteFill>
);
