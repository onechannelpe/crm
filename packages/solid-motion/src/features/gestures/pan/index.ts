import { frame } from "motion-dom";
import { noop } from "motion-utils";

import { addPointerEvent } from "../../../events";
import { getContextWindow } from "../../../utils";
import { Feature } from "../../feature";
import type { PanInfo } from "./PanSession";
import { PanSession } from "./PanSession";

type PanEventHandler = (event: PointerEvent, info: PanInfo) => void;
function asyncHandler(handler?: PanEventHandler) {
  return (event: PointerEvent, info: PanInfo) => {
    if (handler) {
      frame.postRender(() => handler(event, info));
    }
  };
}

export class PanGesture extends Feature {
  static key = "pan" as const;

  private session?: PanSession;

  private removePointerDownListener: Function = noop;

  onPointerDown(pointerDownEvent: PointerEvent) {
    this.session = new PanSession(pointerDownEvent, this.createPanHandlers(), {
      transformPagePoint: this.state.visualElement.getTransformPagePoint(),
      contextWindow: getContextWindow(this.state.visualElement),
    });
  }

  createPanHandlers() {
    return {
      onSessionStart: asyncHandler((_, info) => {
        const { onPanSessionStart } = this.state.options;
        onPanSessionStart?.(_, info);
      }),
      onStart: asyncHandler((_, info) => {
        const { onPanStart } = this.state.options;
        onPanStart?.(_, info);
      }),
      onMove: (event, info) => {
        const { onPan } = this.state.options;
        onPan?.(event, info);
      },
      onEnd: (event: PointerEvent, info: PanInfo) => {
        const { onPanEnd } = this.state.options;
        delete this.session;
        if (onPanEnd) {
          frame.postRender(() => onPanEnd(event, info));
        }
      },
    };
  }

  mount() {
    this.removePointerDownListener = addPointerEvent(
      this.state.element!,
      "pointerdown",
      this.onPointerDown.bind(this),
    );
  }

  update() {}

  unmount() {
    this.removePointerDownListener();
    this.session?.end();
  }
}
