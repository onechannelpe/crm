import { type ParentProps, Show, onCleanup, onMount } from "solid-js";
import { Portal } from "solid-js/web";

import { cn } from "~/lib/utils";

import { useSidePanel } from "../state/use-side-panel";

import styles from "./side-panel-mobile-shell.module.css";

type SidePanelMobileShellProps = ParentProps<{
  targetVariant: "normal" | "fullScreen";
}>;

export function SidePanelMobileShell(props: SidePanelMobileShellProps) {
  const { isOpen, isClosing, closePanel } = useSidePanel();

  let containerRef: HTMLDivElement | undefined;

  const variantClass = () => {
    if (!isOpen() && !isClosing()) return styles.variantClosed;
    if (props.targetVariant === "fullScreen") return styles.variantFullScreen;
    return styles.variantNormal;
  };

  onMount(() => {
    function handlePointerDown(e: PointerEvent) {
      if (!isOpen()) return;
      if (containerRef && !containerRef.contains(e.target as Node)) {
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
          class={cn(
            styles.container,
            variantClass(),
            props.targetVariant === "fullScreen" && styles.mobileMaxHeight,
          )}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
}
