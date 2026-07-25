import { type ParentProps, Show, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";

import { cn } from "~/shared/classnames";

import { SIDE_PANEL_CLICK_OUTSIDE_ID } from "../constants/side-panel-click-outside-id";
import { useSidePanel } from "../state/use-side-panel";

import styles from "./mobile-shell.module.css";

type MobileShellProps = ParentProps<{
  targetVariant: "normal" | "fullScreen";
}>;

export function MobileShell(props: MobileShellProps) {
  const { isOpen, isClosing, closePanel, onCloseAnimationComplete } =
    useSidePanel();

  let containerRef: HTMLDivElement | undefined;

  const variantClass = () => {
    if (!isOpen()) {
      return props.targetVariant === "fullScreen"
        ? styles.variantClosedFullScreen
        : styles.variantClosed;
    }
    if (props.targetVariant === "fullScreen") return styles.variantFullScreen;
    return styles.variantNormal;
  };

  function handleTransitionEnd(event: TransitionEvent) {
    if (event.propertyName === "transform" && !isOpen() && isClosing()) {
      onCloseAnimationComplete();
    }
  }

  onMount(() => {
    function handlePointerDown(e: PointerEvent) {
      if (!isOpen()) return;
      if (
        containerRef &&
        e.target instanceof Node &&
        !containerRef.contains(e.target)
      ) {
        closePanel();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    onCleanup(() =>
      document.removeEventListener("pointerdown", handlePointerDown),
    );
  });

  return (
    <Show when={isOpen() || isClosing()}>
      <Portal mount={document.body}>
        <div
          ref={(el) => {
            containerRef = el;
          }}
          data-click-outside-id={SIDE_PANEL_CLICK_OUTSIDE_ID}
          class={cn(styles.container, variantClass())}
          onTransitionEnd={handleTransitionEnd}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
}
