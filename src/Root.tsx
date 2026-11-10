import React from "react";
import { Composition } from "remotion";
import { TipuShort } from "./videos/tipu/Tipu";
import { TOTAL } from "./videos/tipu/story"; // single source of truth: 2773 frames (92.402 s)

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TipuShort"
        component={TipuShort}
        durationInFrames={TOTAL}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
