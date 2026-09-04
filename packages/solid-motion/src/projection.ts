import {
  HTMLProjectionNode,
  buildHTMLStyles,
  frame,
  measureViewportBox,
  renderHTML,
  type HTMLRenderState,
  type IProjectionNode,
  type ResolvedValues,
  type Transition,
  type VisualElement,
} from "motion-dom";

import { adoptLayoutNode, dropLayoutNode } from "./layout-updates";

/** Which parts of a layout change are animated. */
export type LayoutOption = boolean | "position" | "size" | "x" | "y";

export interface LayoutOptions {
  layout: LayoutOption | undefined;
  layoutId: string | undefined;
}

/** Timing refreshed by the controller for each pass. */
export interface LayoutTiming {
  transition: Transition | undefined;
  /** Whether the change should apply immediately. */
  instant: boolean;
}

export interface Projection {
  /** Paints the element with its projection transform. */
  render(): void;
  setTiming(timing: LayoutTiming): void;
  dispose(): void;
}

/** Adapts an HTML projection node to the small host surface Solid provides. */
export function createProjection(
  element: HTMLElement,
  /** The element's animated values, which the node projects on top of. */
  latestValues: ResolvedValues,
  /** Shared with the value store, so one paint writes both sets of styles. */
  renderState: HTMLRenderState,
  options: LayoutOptions,
): Projection {
  let node: IProjectionNode | undefined;
  const timing: LayoutTiming = { transition: undefined, instant: false };

  const render = () => {
    buildHTMLStyles(renderState, latestValues);
    // Passing the node lets projection compose its transform over the base style.
    renderHTML(element, renderState, undefined, node);
  };

  const host = {
    current: element,
    latestValues,
    props: {},
    renderState,
    getProps: () => ({}),
    getDefaultTransition: () => timing.transition,
    get shouldReduceMotion() {
      return timing.instant;
    },
    // Layout callbacks are not part of the Solid API.
    notify: () => {},
    measureViewportBox: () => measureViewportBox(element),
    scheduleRender: () => {
      frame.render(render);
    },
    render,
    setStaticValue: (key: string, value: string | number) => {
      latestValues[key] = value;
    },
  };

  adoptLayoutNode(element, {
    instant: () => timing.instant,
    create(parent) {
      // The projection node's host type is wider than the concrete HTML node's
      // type, so erase only that type parameter at this boundary.
      node = new HTMLProjectionNode(
        latestValues,
        parent,
      ) as unknown as IProjectionNode;

      node.setOptions({
        // `layoutId` alone also enables projection.
        layout: options.layout ? true : undefined,
        layoutId: options.layoutId,
        animationType:
          typeof options.layout === "string" ? options.layout : "both",
        // Match Motion's shared-element default.
        crossfade: true,
        visualElement: host as unknown as VisualElement,
      });

      return node;
    },
  });

  return {
    render,
    setTiming(next) {
      timing.transition = next.transition;
      timing.instant = next.instant;
    },
    dispose() {
      dropLayoutNode(element);
      node = undefined;
    },
  };
}
