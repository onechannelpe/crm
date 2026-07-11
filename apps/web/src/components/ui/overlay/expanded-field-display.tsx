import { createEffect, createSignal, onCleanup, type JSX } from "solid-js";
import { Portal } from "solid-js/web";

import styles from "./expanded-field-display.module.css";

type ExpandedFieldDisplayProps = {
  anchor: HTMLElement | undefined;
  onClickOutside?: () => void;
  children: JSX.Element;
};

const PANEL_WIDTH = 400;
const PANEL_HEIGHT = 300;
const VIEWPORT_PADDING = 8;

export function ExpandedFieldDisplay(props: ExpandedFieldDisplayProps) {
  const [position, setPosition] = createSignal({ top: 0, left: 0 });
  let panelRef: HTMLDivElement | undefined;

  createEffect(() => {
    const anchor = props.anchor;
    if (!anchor || typeof window === "undefined") return;

    const rect = anchor.getBoundingClientRect();
    const left = Math.min(
      rect.left,
      window.innerWidth - PANEL_WIDTH - VIEWPORT_PADDING,
    );
    const top =
      rect.bottom + PANEL_HEIGHT + VIEWPORT_PADDING > window.innerHeight
        ? Math.max(VIEWPORT_PADDING, rect.top - PANEL_HEIGHT)
        : rect.top;
    setPosition({ top, left: Math.max(VIEWPORT_PADDING, left) });
  });

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Node | null;
    if (panelRef && target && panelRef.contains(target)) return;
    if (props.anchor && target && props.anchor.contains(target)) return;
    props.onClickOutside?.();
  };

  createEffect(() => {
    document.addEventListener("pointerdown", onPointerDown, true);
    onCleanup(() =>
      document.removeEventListener("pointerdown", onPointerDown, true),
    );
  });

  return (
    <Portal>
      <div
        ref={panelRef}
        class={styles.panel}
        style={{ top: `${position().top}px`, left: `${position().left}px` }}
      >
        {props.children}
      </div>
    </Portal>
  );
}
