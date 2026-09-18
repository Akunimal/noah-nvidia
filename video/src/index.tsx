import React from 'react';
import { Audio, Composition, registerRoot, staticFile } from 'remotion';
import { NoahDemo, DURATION_IN_FRAMES, FPS } from './NoahDemo';

const NoahDemoWithNarration: React.FC = () => (
  <>
    <NoahDemo />
    <Audio src={staticFile('noah-narration.wav')} volume={1} />
  </>
);

export const RemotionRoot: React.FC = () => (
  <Composition
    id="NoahDemo"
    component={NoahDemoWithNarration}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);

registerRoot(RemotionRoot);
