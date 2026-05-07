import {
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
} from "solid-js";

import { PresenceChild } from "./presence-child";

export interface AnimatePresenceProps<T> {
  each: readonly T[];
  getKey: (item: T) => string;
  children: (item: T) => JSX.Element;
  initial?: boolean;
  custom?: any;
  onExitComplete?: () => void;
  mode?: "sync" | "wait";
}

interface TrackedChild<T> {
  item: T;
  key: string;
}

export function AnimatePresence<T>(props: AnimatePresenceProps<T>) {
  const [renderedChildren, setRenderedChildren] = createSignal<
    TrackedChild<T>[]
  >([]);
  const [presentChildren, setPresentChildren] = createSignal<TrackedChild<T>[]>(
    [],
  );
  const exitComplete = new Map<string, boolean>();
  const trackedByKey = new Map<string, TrackedChild<T>>();
  let didMount = false;
  const presentKeySet = createMemo(
    () => new Set(presentChildren().map((child) => child.key)),
  );

  createEffect(() => {
    const nextPresentChildren = props.each.map((item) => {
      const key = props.getKey(item);
      const existing = trackedByKey.get(key);
      if (existing) {
        existing.item = item;
        return existing;
      }
      const trackedChild = { item, key };
      trackedByKey.set(key, trackedChild);
      return trackedChild;
    });
    const nextPresentKeys = new Set(
      nextPresentChildren.map((child) => child.key),
    );
    setPresentChildren(nextPresentChildren);

    if (!didMount) {
      didMount = true;
      setRenderedChildren(nextPresentChildren);
      return;
    }

    setRenderedChildren((currentRenderedChildren) => {
      const nextChildren = [...nextPresentChildren];
      const exitingChildren: TrackedChild<T>[] = [];

      currentRenderedChildren.forEach((child, index) => {
        if (!nextPresentKeys.has(child.key)) {
          exitComplete.set(child.key, false);
          nextChildren.splice(index, 0, child);
          exitingChildren.push(child);
        } else {
          exitComplete.delete(child.key);
        }
      });

      if ((props.mode ?? "sync") === "wait" && exitingChildren.length > 0) {
        return exitingChildren;
      }

      return nextChildren;
    });
  });

  const handleChildExitComplete = (key: string) => {
    if (!exitComplete.has(key)) return;
    exitComplete.set(key, true);

    for (const complete of exitComplete.values()) {
      if (!complete) return;
    }

    const currentPresentKeys = new Set(
      presentChildren().map((child) => child.key),
    );
    setRenderedChildren((currentRenderedChildren) =>
      currentRenderedChildren.filter((child) =>
        currentPresentKeys.has(child.key),
      ),
    );
    Array.from(trackedByKey.keys()).forEach((trackedKey) => {
      if (!currentPresentKeys.has(trackedKey)) {
        trackedByKey.delete(trackedKey);
      }
    });
    exitComplete.clear();
    props.onExitComplete?.();
  };

  return (
    <>
      <For each={renderedChildren()}>
        {(child) => {
          return (
            <PresenceChild
              key={child.key}
              isPresent={presentKeySet().has(child.key)}
              initial={props.initial === false ? false : undefined}
              custom={props.custom}
              presenceAffectsLayout
              mode="sync"
              onExitComplete={() => handleChildExitComplete(child.key)}
            >
              {props.children(child.item)}
            </PresenceChild>
          );
        }}
      </For>
    </>
  );
}
