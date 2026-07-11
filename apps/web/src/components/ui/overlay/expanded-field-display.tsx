import { createEffect, createSignal, onCleanup, type JSX } from "solid-js";
import { Portal } from "solid-js/web";

import styles from "./expanded-field-display.module.css";

const PANEL_WIDTH = 400;
const PANEL_HEIGHT = 300;
const VIEWPORT_PADDING = 8;

export function ExpandedFieldDisplay(props: {
  anchor: HTMLElement | undefined;
  onClickOutside?: () => void;
  children: JSX.Element;
}) {
  const [position, setPosition] = createSignal({ top: 0, left: 0 });
  let panel: HTMLDivElement | undefined;

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

  createEffect(() => {
    if (!props.onClickOutside || typeof document === "undefined") return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (panel?.contains(event.target) || props.anchor?.contains(event.target))
        return;
      props.onClickOutside?.();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClickOutside?.();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    });
  });

  return (
    <Portal>
      <div
        ref={(element) => {
          panel = element;
        }}
        class={styles.panel}
        role="dialog"
        style={{ top: `${position().top}px`, left: `${position().left}px` }}
      >
        {props.children}
      </div>
    </Portal>
  );
}
