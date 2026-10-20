import React from 'react';
import {Composition, Still} from 'remotion';
import {FPS, HERO_DUR, PROMO_DUR} from './timeline';
import {Promo} from './Story';
import {Hero} from './Hero';
import {Banner, SocialPreview} from './stills';

export const Root: React.FC = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={PROMO_DUR} fps={FPS} width={1920} height={1080} defaultProps={{layout: 'landscape' as const}} />
    <Composition
      id="PromoVertical"
      component={Promo}
      durationInFrames={PROMO_DUR}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{layout: 'portrait' as const}}
    />
    <Composition id="Hero" component={Hero} durationInFrames={HERO_DUR} fps={FPS} width={2560} height={1440} />
    <Still id="Banner" component={Banner} width={1280} height={360} />
    <Still id="SocialPreview" component={SocialPreview} width={1280} height={640} />
  </>
);
