import {
  children,
  createEffect,
  createSignal,
  onCleanup,
  type JSX,
} from "solid-js";

export interface AnimatePresenceProps {
  children: JSX.Element;
  mode?: "sync" | "wait";
  exitDurationMs?: number;
  onExitComplete?: () => void;
}

export function AnimatePresence(props: AnimatePresenceProps) {
  const resolvedChildren = children(() => props.children);
  type PresenceChild = ReturnType<typeof resolvedChildren.toArray>[number];

  const [renderedChildren, setRenderedChildren] = createSignal<PresenceChild[]>(
    resolvedChildren.toArray(),
  );
  let exitTimer: ReturnType<typeof setTimeout> | undefined;

  createEffect(() => {
    const nextChildren = resolvedChildren.toArray();
    const currentChildren = renderedChildren();
    const removedChildren = currentChildren.filter(
      (child) => !nextChildren.includes(child),
    );

    if (removedChildren.length === 0) {
      setRenderedChildren(nextChildren);
      return;
    }

    const nextRendered =
      props.mode === "wait"
        ? removedChildren
        : mergeWithExitingChildren(
            nextChildren,
            currentChildren,
            removedChildren,
          );

    setRenderedChildren(nextRendered);
    clearTimeout(exitTimer);

    exitTimer = setTimeout(() => {
      setRenderedChildren((activeChildren) =>
        activeChildren.filter((child) => !removedChildren.includes(child)),
      );
      props.onExitComplete?.();
    }, props.exitDurationMs ?? 200);
  });

  onCleanup(() => clearTimeout(exitTimer));

  return <>{renderedChildren()}</>;
}

function mergeWithExitingChildren<T>(
  nextChildren: T[],
  currentChildren: T[],
  removedChildren: T[],
): T[] {
  const mergedChildren = [...nextChildren];
  currentChildren.forEach((child, index) => {
    if (removedChildren.includes(child)) {
      mergedChildren.splice(index, 0, child);
    }
  });
  return mergedChildren;
}
