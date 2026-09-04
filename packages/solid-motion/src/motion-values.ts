import {
  MotionValue,
  attachFollow,
  cancelFrame,
  frame,
  isMotionValue,
  type FrameData,
} from "motion-dom";
import { createEffect, onCleanup, untrack } from "solid-js";

import type { MotionStyle, MotionStyleValue, Transition } from "./types";

export type MotionSource<T> = T | (() => T) | MotionValue<T>;

/**
 * Creates a MotionValue from a literal, Solid accessor, or MotionValue.
 *
 * Accessors update through Solid effects, transitions animate source changes,
 * and the returned value is destroyed with its scope.
 */
export function createMotionValue<T extends string | number>(
  source: MotionSource<T>,
  transition?: Transition,
): MotionValue<T> {
  const value = new MotionValue(untrack(() => read(source)));
  onCleanup(() => value.destroy());

  if (isMotionValue(source)) {
    // MotionValue sources are outside Solid's graph, so subscribe directly.
    // attachFollow handles the subscription when a transition is requested.
    onCleanup(
      transition
        ? attachFollow(value, source, transition)
        : source.on("change", (latest: T) => value.set(latest)),
    );
    return value;
  }

  // Accessor updates call set, so attach the transition before creating the effect.
  if (transition) attachFollow(value, value.get(), transition);
  if (typeof source === "function") {
    createEffect(source as () => T, (latest) => value.set(latest));
  }

  return value;
}

/** Tracks a source's velocity and decays it after the source stops changing. */
export function createVelocity(
  source: MotionValue<number>,
): MotionValue<number> {
  const velocity = new MotionValue(source.getVelocity());
  onCleanup(() => velocity.destroy());

  const sample = () => {
    const latest = source.getVelocity();
    velocity.set(latest);
    if (latest) frame.update(sample);
  };

  onCleanup(source.on("change", () => frame.update(sample, false, true)));
  // A sample queued before disposal must not update the destroyed value.
  onCleanup(() => cancelFrame(sample));

  return velocity;
}

/** Tracks elapsed milliseconds using the frame loop's shared clock. */
export function createTime(): MotionValue<number> {
  const value = new MotionValue(0);
  onCleanup(() => value.destroy());

  let start: number | undefined;
  const tick = ({ timestamp }: FrameData) => {
    start ??= timestamp;
    value.set(timestamp - start);
  };

  frame.update(tick, true);
  onCleanup(() => cancelFrame(tick));

  return value;
}

function read<T extends string | number>(source: MotionSource<T>): T {
  if (typeof source === "function") return source();
  // The unparameterized guard needs a cast back to MotionValue<T>.
  if (isMotionValue(source)) return source.get() as T;
  return source as T;
}

export function isMotionStyleValue(entry: unknown): entry is MotionStyleValue {
  return typeof entry === "function" || isMotionValue(entry);
}

export interface BoundStyle {
  values: Map<string, MotionValue>;
  /**
   * Initial values to paint before a bound MotionValue changes. Binding records
   * the value but does not schedule a render.
   */
  painted: Record<string, string | number>;
}

export function readStyleValues(style: MotionStyle | undefined): BoundStyle {
  const values = new Map<string, MotionValue>();
  const painted: Record<string, string | number> = {};
  if (!style) return { values, painted };

  for (const [key, entry] of Object.entries(style)) {
    if (!isMotionStyleValue(entry)) continue;

    const value = isMotionValue(entry)
      ? entry
      : createMotionValue(entry as () => string | number);

    values.set(key, value);
    painted[key] = value.get() as string | number;
  }

  return { values, painted };
}
