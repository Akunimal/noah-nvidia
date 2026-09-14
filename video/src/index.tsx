import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { NoahDemo, DURATION_IN_FRAMES, FPS } from './NoahDemo';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="NoahDemo"
    component={NoahDemo}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);

registerRoot(RemotionRoot);
