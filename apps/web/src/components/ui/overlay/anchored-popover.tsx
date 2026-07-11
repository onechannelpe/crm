import { onCleanup, onMount, type JSX } from "solid-js";
import { Portal } from "solid-js/web";

import styles from "./anchored-popover.module.css";

const VIEWPORT_PADDING = 8;

export function AnchoredPopover(props: {
  id: string;
  anchor: HTMLElement;
  onClose: () => void;
  children: JSX.Element;
}) {
  let panel: HTMLDivElement | undefined;

  const updatePosition = () => {
    if (!panel) return;
    const anchorRect = props.anchor.getBoundingClientRect();
    const left = Math.min(
      anchorRect.left,
      window.innerWidth - panel.offsetWidth - VIEWPORT_PADDING,
    );
    const top =
      anchorRect.bottom + panel.offsetHeight + VIEWPORT_PADDING >
      window.innerHeight
        ? anchorRect.top - panel.offsetHeight
        : anchorRect.bottom;
    panel.style.left = `${Math.max(VIEWPORT_PADDING, left)}px`;
    panel.style.top = `${Math.max(VIEWPORT_PADDING, top)}px`;
  };

  onMount(() => {
    if (!panel) return;
    const currentPanel = panel;
    const onToggle = (event: ToggleEvent) => {
      if (event.newState === "closed") props.onClose();
    };

    currentPanel.addEventListener("toggle", onToggle);
    currentPanel.showPopover();
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    onCleanup(() => {
      currentPanel.removeEventListener("toggle", onToggle);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    });
  });

  return (
    <Portal>
      <div ref={panel} id={props.id} class={styles.panel} popover="auto">
        {props.children}
      </div>
    </Portal>
  );
}
