import { createVisualElement } from "../state/create-visual-element";
import { AnimationFeature } from "./animation/animation";
import type { Feature } from "./feature";
import { FocusGesture } from "./gestures/focus";
import { HoverGesture } from "./gestures/hover";
import { InViewGesture } from "./gestures/in-view";
import { PressGesture } from "./gestures/press";

export interface FeatureBundle {
  renderer: typeof createVisualElement;
  features: Array<typeof Feature>;
}

export const domAnimation: FeatureBundle = {
  renderer: createVisualElement,
  features: [
    AnimationFeature,
    PressGesture,
    HoverGesture,
    InViewGesture,
    FocusGesture,
  ],
};
