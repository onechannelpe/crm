import { HalftoneImageCanvas } from "~/lib/halftone/image-canvas";
import { WebGlMount } from "~/lib/visual-runtime";

import {
  MILESTONE_IMAGE_FIT,
  MILESTONE_IMAGE_URL,
  MILESTONE_INITIAL_POSE,
  MILESTONE_PREVIEW_DISTANCE,
  buildMilestoneSettings,
} from "./milestone-config";

import styles from "./styles/layout.module.css";

const RELEASE_NOTES_SETTINGS = buildMilestoneSettings({
  animation: {
    hoverLightEnabled: true,
    hoverLightIntensity: 1.2,
    hoverLightRadius: 0.45,
  },
  background: {
    color: "#777777",
    transparent: false,
  },
  halftone: {
    dashColor: "#F3F3F3",
    hoverDashColor: "#F3F3F3",
    imageContrast: 1,
    power: -0.07,
    scale: 17.8,
    toneTarget: "light",
    width: 0.46,
  },
});

function UpdatesHeroVisualScene() {
  return (
    <div aria-hidden="true" class={styles.heroVisual}>
      <HalftoneImageCanvas
        imageFit={MILESTONE_IMAGE_FIT}
        imageUrl={MILESTONE_IMAGE_URL}
        initialPose={MILESTONE_INITIAL_POSE}
        previewDistance={MILESTONE_PREVIEW_DISTANCE}
        settings={RELEASE_NOTES_SETTINGS}
      />
    </div>
  );
}

export function UpdatesHeroVisual() {
  return (
    <WebGlMount priority>
      <UpdatesHeroVisualScene />
    </WebGlMount>
  );
}
