import { cancelFrame, distance2D, frame, frameData } from "framer-motion/dom";
import type { EventInfo } from "motion-dom";
import type { Point, TransformPoint } from "motion-utils";
import {
  millisecondsToSeconds,
  pipe,
  secondsToMilliseconds,
} from "motion-utils";

import { addPointerEvent, isPrimaryPointer } from "../../../events";
import { extractEventInfo } from "../../../events/event-info";
export interface PanInfo {
  point: Point;
  delta: Point;
  offset: Point;
  velocity: Point;
}

export type PanHandler = (event: Event, info: PanInfo) => void;
interface PanSessionHandlers {
  onSessionStart: PanHandler;
  onStart: PanHandler;
  onMove: PanHandler;
  onEnd: PanHandler;
  onSessionEnd: PanHandler;
  resumeAnimation: () => void;
}

interface PanSessionOptions {
  transformPagePoint?: TransformPoint;
  contextWindow?: (Window & typeof globalThis) | null;
  dragSnapToOrigin?: boolean;
  element?: HTMLElement | null;
}

interface TimestampedPoint extends Point {
  timestamp: number;
}

const overflowStyles = /* #__PURE__ */ new Set(["auto", "scroll"]);

export class PanSession {
  private history: TimestampedPoint[];
  private startEvent: PointerEvent | null = null;
  private lastMoveEvent: PointerEvent | null = null;
  private lastMoveEventInfo: EventInfo | null = null;
  private transformPagePoint?: TransformPoint;
  private handlers: Partial<PanSessionHandlers> = {};
  private removeListeners: Function;
  private dragSnapToOrigin: boolean;
  private contextWindow: PanSessionOptions["contextWindow"] = window;

  element?: HTMLElement | null;
  private scrollPositions = new Map<Element | Window, Point>();
  private removeScrollListeners?: () => void;

  constructor(
    event: PointerEvent,
    handlers: Partial<PanSessionHandlers>,
    {
      transformPagePoint,
      contextWindow,
      dragSnapToOrigin = false,
      element,
    }: PanSessionOptions = {},
  ) {
    if (!isPrimaryPointer(event)) return;

    this.dragSnapToOrigin = dragSnapToOrigin;
    this.handlers = handlers;
    this.transformPagePoint = transformPagePoint;
    this.contextWindow = contextWindow || window;

    const info = extractEventInfo(event);
    const initialInfo = transformPoint(info, this.transformPagePoint);
    const { point } = initialInfo;

    const { timestamp } = frameData;

    this.history = [{ ...point, timestamp }];

    const { onSessionStart } = handlers;
    onSessionStart?.(event, getPanInfo(initialInfo, this.history));

    this.removeListeners = pipe(
      addPointerEvent(
        this.contextWindow,
        "pointermove",
        this.handlePointerMove,
      ),
      addPointerEvent(this.contextWindow, "pointerup", this.handlePointerUp),
      addPointerEvent(
        this.contextWindow,
        "pointercancel",
        this.handlePointerUp,
      ),
    );

    if (element) {
      this.startScrollTracking(element);
    }
  }

  private isScrollable(node: Element): boolean {
    const style = window.getComputedStyle(node);
    return (
      style.overflow === "auto" ||
      style.overflow === "scroll" ||
      style.overflowX === "auto" ||
      style.overflowX === "scroll" ||
      style.overflowY === "auto" ||
      style.overflowY === "scroll"
    );
  }

  private startScrollTracking(element: HTMLElement): void {
    let current = element.parentElement;
    while (current) {
      const style = getComputedStyle(current);
      if (
        overflowStyles.has(style.overflowX) ||
        overflowStyles.has(style.overflowY)
      ) {
        this.scrollPositions.set(current, {
          x: current.scrollLeft,
          y: current.scrollTop,
        });
      }
      current = current.parentElement;
    }

    this.scrollPositions.set(window, {
      x: window.scrollX,
      y: window.scrollY,
    });

    // Element scroll events must be captured because they do not bubble.
    window.addEventListener("scroll", this.onElementScroll, {
      capture: true,
      passive: true,
    });

    // Window scroll requires its own listener because it does not bubble.
    window.addEventListener("scroll", this.onWindowScroll, {
      passive: true,
    });

    this.removeScrollListeners = () => {
      window.removeEventListener("scroll", this.onElementScroll, {
        capture: true,
      });
      window.removeEventListener("scroll", this.onWindowScroll);
    };
  }

  private onElementScroll = (event: Event): void => {
    this.handleScroll(event.target as Element);
  };

  private onWindowScroll = (): void => {
    this.handleScroll(window);
  };

  private handleScroll(target: Element | Window): void {
    const initial = this.scrollPositions.get(target);
    if (!initial) return;

    const isWindow = target === window;
    const current = isWindow
      ? { x: window.scrollX, y: window.scrollY }
      : {
          x: (target as Element).scrollLeft,
          y: (target as Element).scrollTop,
        };

    const delta = { x: current.x - initial.x, y: current.y - initial.y };
    if (delta.x === 0 && delta.y === 0) return;

    if (isWindow) {
      // Window scroll changes page coordinates; element scroll does not.
      if (this.lastMoveEventInfo) {
        this.lastMoveEventInfo.point.x += delta.x;
        this.lastMoveEventInfo.point.y += delta.y;
      }
    } else {
      if (this.history.length > 0) {
        this.history[0].x -= delta.x;
        this.history[0].y -= delta.y;
      }
    }

    this.scrollPositions.set(target, current);
    frame.update(this.updatePoint, true);
  }

  private updatePoint = () => {
    if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return;

    const info = getPanInfo(this.lastMoveEventInfo, this.history);
    const isPanStarted = this.startEvent !== null;

    // 3px distinguishes a drag from a click without a visible cursor jump.
    const isDistancePastThreshold =
      distance2D(info.offset, { x: 0, y: 0 }) >= 3;

    if (!isPanStarted && !isDistancePastThreshold) return;

    const { point } = info;
    const { timestamp } = frameData;
    this.history.push({ ...point, timestamp });

    const { onStart, onMove } = this.handlers;

    if (!isPanStarted) {
      onStart?.(this.lastMoveEvent, info);
      this.startEvent = this.lastMoveEvent;
    }
    onMove?.(this.lastMoveEvent, info);
  };

  private handlePointerMove = (event: PointerEvent, info: EventInfo) => {
    this.lastMoveEvent = event;
    this.lastMoveEventInfo = transformPoint(info, this.transformPagePoint);
    frame.update(this.updatePoint, true);
  };

  private handlePointerUp = (event: PointerEvent, info: EventInfo) => {
    this.end();

    const { onEnd, onSessionEnd, resumeAnimation } = this.handlers;

    // A click pauses constraints during pointerdown but never starts a drag.
    if (this.dragSnapToOrigin || !this.startEvent) {
      resumeAnimation?.();
    }
    if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return;

    const panInfo = getPanInfo(
      event.type === "pointercancel"
        ? this.lastMoveEventInfo
        : transformPoint(info, this.transformPagePoint),
      this.history,
    );

    if (this.startEvent && onEnd) {
      onEnd(event, panInfo);
    }

    onSessionEnd?.(event, panInfo);
  };

  updateHandlers(handlers: Partial<PanSessionHandlers>) {
    this.handlers = handlers;
  }

  end() {
    this.removeListeners?.();
    this.removeScrollListeners?.();
    this.scrollPositions.clear();
    cancelFrame(this.updatePoint);
  }
}

function transformPoint(
  info: EventInfo,
  transformPagePoint?: (point: Point) => Point,
) {
  return transformPagePoint ? { point: transformPagePoint(info.point) } : info;
}

function subtractPoint(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function getPanInfo({ point }: EventInfo, history: TimestampedPoint[]) {
  return {
    point,
    delta: subtractPoint(point, lastDevicePoint(history)),
    offset: subtractPoint(point, startDevicePoint(history)),
    velocity: getVelocity(history, 0.1),
  };
}

function startDevicePoint(history: TimestampedPoint[]): TimestampedPoint {
  return history[0];
}

function lastDevicePoint(history: TimestampedPoint[]): TimestampedPoint {
  return history[history.length - 1];
}

function getVelocity(history: TimestampedPoint[], timeDelta: number): Point {
  if (history.length < 2) {
    return { x: 0, y: 0 };
  }

  let i = history.length - 1;
  let timestampedPoint: TimestampedPoint | null = null;
  const lastPoint = lastDevicePoint(history);
  while (i >= 0) {
    timestampedPoint = history[i];
    if (
      lastPoint.timestamp - timestampedPoint.timestamp >
      secondsToMilliseconds(timeDelta)
    ) {
      break;
    }
    i--;
  }

  if (!timestampedPoint) {
    return { x: 0, y: 0 };
  }

  const time = millisecondsToSeconds(
    lastPoint.timestamp - timestampedPoint.timestamp,
  );
  if (time === 0) {
    return { x: 0, y: 0 };
  }

  const currentVelocity = {
    x: (lastPoint.x - timestampedPoint.x) / time,
    y: (lastPoint.y - timestampedPoint.y) / time,
  };

  if (currentVelocity.x === Infinity) {
    currentVelocity.x = 0;
  }
  if (currentVelocity.y === Infinity) {
    currentVelocity.y = 0;
  }

  return currentVelocity;
}
