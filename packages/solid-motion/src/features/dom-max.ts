import { createVisualElement } from "../state/create-visual-element";
import { AnimationFeature } from "./animation/animation";
import type { FeatureBundle } from "./dom-animation";
import { DragGesture } from "./gestures/drag";
import { FocusGesture } from "./gestures/focus";
import { HoverGesture } from "./gestures/hover";
import { InViewGesture } from "./gestures/in-view";
import { PanGesture } from "./gestures/pan";
import { PressGesture } from "./gestures/press";
import { LayoutFeature } from "./layout/layout";
import { ProjectionFeature } from "./layout/projection";

export const domMax: FeatureBundle = {
  renderer: createVisualElement,
  features: [
    AnimationFeature,
    PressGesture,
    HoverGesture,
    InViewGesture,
    FocusGesture,
    ProjectionFeature,
    PanGesture,
    DragGesture,
    LayoutFeature,
  ],
};
