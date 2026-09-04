import {
  frame,
  GroupAnimationWithThen,
  positionalKeys,
  resolveElements,
  type AnimationPlaybackControlsWithThen,
  type ElementOrSelector,
  type ValueKeyframesDefinition,
} from "motion-dom";
import { createSignal, onCleanup } from "solid-js";

import { useMotionConfig } from "./config";
import { useReducedMotion } from "./reduced-motion";
import type { TargetAndTransition, Transition } from "./types";
import { createValueStore, type ValueStore } from "./values";

/** A Solid ref whose current element is also the root for selector targets. */
export type AnimateScope<T extends Element = HTMLElement> = ((
  element: T,
) => void) & {
  readonly current: T | undefined;
};

export type AnimateTarget = ElementOrSelector;

export type AnimateSegment = readonly [
  target: AnimateTarget,
  definition: TargetAndTransition,
];

/**
 * Segments run in order, with each one waiting for the previous one to finish.
 */
export type AnimateSequence = readonly AnimateSegment[];

export interface AnimateFunction {
  (
    target: AnimateTarget,
    definition: TargetAndTransition,
  ): AnimationPlaybackControlsWithThen;
  (sequence: AnimateSequence): AnimationPlaybackControlsWithThen;
}

/** Store state per element so scopes targeting it share animation state. */
const stores = new WeakMap<Element, ValueStore>();

function storeFor(element: Element): ValueStore {
  const existing = stores.get(element);
  if (existing) return existing;

  const store = createValueStore(
    element as HTMLElement | SVGElement,
    {},
    new Map(),
  );
  stores.set(element, store);
  return store;
}

/** Element lists are arrays too, so sequences are identified by nested tuples. */
function isSequence(
  value: AnimateTarget | AnimateSequence,
): value is AnimateSequence {
  return Array.isArray(value) && value.some((entry) => Array.isArray(entry));
}

/**
 * Reduced motion disables positional animation, while `skipAnimations` tells
 * motion-dom to apply the target immediately.
 */
function resolveTransition(
  key: string,
  transition: Transition | undefined,
  reducedMotion: boolean,
  skipAnimations: boolean,
): Transition | undefined {
  if (reducedMotion && positionalKeys.has(key)) {
    return { type: false } as Transition;
  }
  if (!skipAnimations) return transition;
  return { ...transition, skipAnimations: true } as Transition;
}

/**
 * Proxy controls to the current animation. It is created on the update frame,
 * and sequences replace it as each segment finishes.
 */
function delegatedControls(
  finished: Promise<void>,
  getActive: () => AnimationPlaybackControlsWithThen | undefined,
  stop: VoidFunction,
): AnimationPlaybackControlsWithThen {
  return {
    get time() {
      return getActive()?.time ?? 0;
    },
    set time(value: number) {
      const active = getActive();
      if (active) active.time = value;
    },
    get speed() {
      return getActive()?.speed ?? 1;
    },
    set speed(value: number) {
      const active = getActive();
      if (active) active.speed = value;
    },
    get startTime() {
      return getActive()?.startTime ?? null;
    },
    get state() {
      return getActive()?.state ?? "idle";
    },
    get duration() {
      return getActive()?.duration ?? 0;
    },
    get iterationDuration() {
      return getActive()?.iterationDuration ?? 0;
    },
    finished,
    stop,
    play() {
      getActive()?.play();
    },
    pause() {
      getActive()?.pause();
    },
    complete() {
      getActive()?.complete();
    },
    cancel() {
      stop();
      getActive()?.cancel();
    },
    attachTimeline: (timeline) =>
      getActive()?.attachTimeline(timeline) ?? (() => undefined),
    then: (onResolve, onReject) => finished.then(onResolve, onReject),
  };
}

/**
 * Resolve targets now so selector scope is stable. Defer animation creation to
 * motion-dom's frame update so it receives the current frame time.
 */
function runTarget(
  target: AnimateTarget,
  definition: TargetAndTransition,
  current: Element | undefined,
  reducedMotion: boolean,
  skipAnimations: boolean,
): AnimationPlaybackControlsWithThen {
  const elements = resolveElements(target, { current, animations: [] });
  const { transition, transitionEnd, ...values } = definition;

  let active: GroupAnimationWithThen | undefined;
  let stopped = false;

  const finished = new Promise<void>((resolve) => {
    frame.update(() => {
      if (stopped) {
        resolve();
        return;
      }

      const animations: AnimationPlaybackControlsWithThen[] = [];
      for (const element of elements) {
        const store = storeFor(element);
        for (const [key, value] of Object.entries(values)) {
          if (value === undefined || value === null) continue;
          const animation = store.animate(
            key,
            value as ValueKeyframesDefinition,
            resolveTransition(key, transition, reducedMotion, skipAnimations),
          );
          if (animation) animations.push(animation);
        }
      }

      active = new GroupAnimationWithThen(animations);
      active.finished
        .then(() => {
          if (!transitionEnd) return;
          for (const element of elements) {
            const store = storeFor(element);
            for (const [key, value] of Object.entries(transitionEnd)) {
              store.set(key, value);
            }
          }
        })
        .catch(() => undefined)
        .finally(resolve);
    });
  });

  return delegatedControls(
    finished,
    () => active,
    () => {
      stopped = true;
      active?.stop();
    },
  );
}

function runSequence(
  sequence: AnimateSequence,
  current: Element | undefined,
  reducedMotion: boolean,
  skipAnimations: boolean,
): AnimationPlaybackControlsWithThen {
  let active: AnimationPlaybackControlsWithThen | undefined;
  let stopped = false;

  const finished = (async () => {
    for (const [target, definition] of sequence) {
      if (stopped) return;
      active = runTarget(target, definition, current, reducedMotion, skipAnimations);
      await active.finished.catch(() => undefined);
    }
  })();

  return delegatedControls(
    finished,
    () => active,
    () => {
      stopped = true;
      active?.stop();
    },
  );
}

/** Create a Solid ref and an imperative animation function for its scope. */
export function createAnimate<
  T extends Element = HTMLElement,
>(): [scope: AnimateScope<T>, animate: AnimateFunction] {
  const [element, setElement] = createSignal<T>();

  // Solid refs are callbacks, so add `current` to the callable ref shape.
  const scope = ((node: T) =>
    setElement(() => node)) as unknown as AnimateScope<T>;
  Object.defineProperty(scope, "current", { get: () => element() });

  const prefersReducedMotion = useReducedMotion();
  const config = useMotionConfig();

  const running: AnimationPlaybackControlsWithThen[] = [];
  const track = (animation: AnimationPlaybackControlsWithThen) => {
    running.push(animation);
    animation.finished
      .catch(() => undefined)
      .finally(() => {
        const index = running.indexOf(animation);
        if (index !== -1) running.splice(index, 1);
      });
  };

  // Stop animations when the scope unmounts so detached elements stop receiving
  // frames.
  onCleanup(() => {
    for (const animation of running) animation.stop();
    running.length = 0;
  });

  const animate = ((
    targetOrSequence: AnimateTarget | AnimateSequence,
    definition?: TargetAndTransition,
  ): AnimationPlaybackControlsWithThen => {
    const reducedMotion =
      config.reducedMotion === "always" ||
      (config.reducedMotion === "user" && prefersReducedMotion());
    const skipAnimations = config.skipAnimations ?? false;
    const current = element();

    const result = isSequence(targetOrSequence)
      ? runSequence(targetOrSequence, current, reducedMotion, skipAnimations)
      : runTarget(
          targetOrSequence,
          definition!,
          current,
          reducedMotion,
          skipAnimations,
        );

    track(result);
    return result;
  }) as AnimateFunction;

  return [scope, animate];
}
