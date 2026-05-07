import { children, createEffect, createSignal, type JSX } from "solid-js";

import { PresenceChild } from "./presence-child";
import { usePresence } from "./use-presence";

export interface AnimatePresenceProps {
  children: JSX.Element;
  initial?: boolean;
  custom?: any;
  onExitComplete?: () => void;
  mode?: "sync" | "popLayout" | "wait";
  root?: HTMLElement | ShadowRoot;
  presenceAffectsLayout?: boolean;
  propagate?: boolean;
  anchorX?: "left" | "right";
  anchorY?: "top" | "bottom";
}

interface TrackedChild {
  element: JSX.Element;
  key: string;
}

export function AnimatePresence(props: AnimatePresenceProps) {
  const [isParentPresent, safeToRemove] = usePresence(props.propagate ?? false);
  const resolvedChildren = children(() => props.children);

  const [diffedChildren, setDiffedChildren] = createSignal<TrackedChild[]>([]);
  const [renderedChildren, setRenderedChildren] = createSignal<TrackedChild[]>([]);
  const pendingPresentChildren: { current: TrackedChild[] } = { current: [] };
  const exitComplete = new Map<string, boolean>();
  const exitingComponents = new Set<string>();

  createEffect(() => {
    const presentChildren = onlyElements(resolvedChildren.toArray());
    const presentKeys =
      props.propagate && !isParentPresent()
        ? []
        : presentChildren.map((child) => child.key);

    pendingPresentChildren.current = presentChildren;

    renderedChildren().forEach((child) => {
      if (!presentKeys.includes(child.key)) {
        if (exitComplete.get(child.key) !== true) {
          exitComplete.set(child.key, false);
        }
      } else {
        exitComplete.delete(child.key);
        exitingComponents.delete(child.key);
      }
    });

    const currentDiffed = diffedChildren();
    if (sameKeyOrder(presentChildren, currentDiffed)) return;

    let nextChildren = [...presentChildren];
    const exitingChildren: TrackedChild[] = [];

    renderedChildren().forEach((child, index) => {
      if (!presentKeys.includes(child.key)) {
        nextChildren.splice(index, 0, child);
        exitingChildren.push(child);
      }
    });

    if ((props.mode ?? "sync") === "wait" && exitingChildren.length > 0) {
      nextChildren = exitingChildren;
    }

    setRenderedChildren(nextChildren);
    setDiffedChildren(presentChildren);
  });

  const onChildExit = (key: string) => {
    if (exitingComponents.has(key)) return;
    if (!exitComplete.has(key)) return;

    exitingComponents.add(key);
    exitComplete.set(key, true);

    for (const isComplete of exitComplete.values()) {
      if (!isComplete) return;
    }

    setRenderedChildren(pendingPresentChildren.current);
    if (props.propagate) safeToRemove?.();
    props.onExitComplete?.();
  };

  if (
    import.meta.env.DEV &&
    (props.mode ?? "sync") === "wait" &&
    renderedChildren().length > 1
  ) {
    console.warn(
      "AnimatePresence mode=\"wait\" with multiple children can lead to odd behavior.",
    );
  }

  return (
    <>
      {renderedChildren().map((child) => {
        const presentChildren = onlyElements(resolvedChildren.toArray());
        const presentKeys =
          props.propagate && !isParentPresent()
            ? []
            : presentChildren.map((item) => item.key);

        const isPresent =
          sameKeyOrder(presentChildren, renderedChildren()) ||
          presentKeys.includes(child.key);

        return (
          <PresenceChild
            isPresent={isPresent}
            initial={props.initial === false ? false : undefined}
            custom={props.custom}
            presenceAffectsLayout={props.presenceAffectsLayout ?? true}
            mode={props.mode ?? "sync"}
            root={props.root}
            anchorX={props.anchorX}
            anchorY={props.anchorY}
            onExitComplete={isPresent ? undefined : () => onChildExit(child.key)}
          >
            {child.element}
          </PresenceChild>
        );
      })}
    </>
  );
}

function onlyElements(values: unknown[]): TrackedChild[] {
  const tracked: TrackedChild[] = [];
  values.forEach((value, index) => {
    if (value === null || value === undefined || value === false) return;
    tracked.push({
      element: value as JSX.Element,
      key: childKey(value, index),
    });
  });
  return tracked;
}

function childKey(child: unknown, index: number): string {
  if (typeof child === "object" && child !== null) {
    const maybeKey = (child as { key?: unknown }).key;
    if (typeof maybeKey === "string" || typeof maybeKey === "number") {
      return String(maybeKey);
    }
  }
  return `__index_${index}`;
}

function sameKeyOrder(a: TrackedChild[], b: TrackedChild[]) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index]?.key !== b[index]?.key) return false;
  }
  return true;
}
