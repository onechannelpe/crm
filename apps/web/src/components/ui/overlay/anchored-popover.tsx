import {
  createEffect,
  onCleanup,
  onMount,
  type Accessor,
  type JSX,
} from "solid-js";
import { Portal } from "solid-js/web";

import { cn } from "~/lib/utils";

import styles from "./anchored-popover.module.css";

const VIEWPORT_PADDING = 8;

type Anchor = HTMLElement | Accessor<HTMLElement | undefined>;

export function AnchoredPopover(props: {
  id?: string;
  anchor: Anchor;
  children: JSX.Element;
  class?: string;
  dismissible?: boolean;
  matchAnchorWidth?: boolean;
  onClose: () => void;
  placement?: "bottom-start" | "bottom-end" | "overlap";
  variant?: "panel" | "positioner";
}) {
  let panel: HTMLDivElement | undefined;
  const anchor = () =>
    typeof props.anchor === "function" ? props.anchor() : props.anchor;

  function updatePosition() {
    const anchorElement = anchor();
    if (!panel || !anchorElement) {
      return;
    }

    const rect = anchorElement.getBoundingClientRect();
    const placement = props.placement ?? "bottom-start";
    const preferredLeft =
      placement === "bottom-end" ? rect.right - panel.offsetWidth : rect.left;
    const left = Math.max(
      VIEWPORT_PADDING,
      Math.min(
        preferredLeft,
        window.innerWidth - panel.offsetWidth - VIEWPORT_PADDING,
      ),
    );
    const preferredTop = placement === "overlap" ? rect.top : rect.bottom;
    const top =
      preferredTop + panel.offsetHeight + VIEWPORT_PADDING > window.innerHeight
        ? Math.max(VIEWPORT_PADDING, rect.top - panel.offsetHeight)
        : preferredTop;

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.minWidth = props.matchAnchorWidth ? `${rect.width}px` : "";
  }

  onMount(() => {
    if (!panel) {
      return;
    }

    const currentPanel = panel;
    const handleToggle = (event: ToggleEvent) => {
      if (event.newState === "closed") {
        props.onClose();
      }
    };

    if (props.dismissible !== false) {
      currentPanel.addEventListener("toggle", handleToggle);
      currentPanel.showPopover();
      queueMicrotask(() =>
        currentPanel.querySelector<HTMLElement>("[autofocus]")?.focus(),
      );
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    onCleanup(() => {
      currentPanel.removeEventListener("toggle", handleToggle);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      if (props.dismissible !== false) {
        anchor()?.focus();
      }
    });
  });

  createEffect(() => {
    const anchorElement = anchor();
    updatePosition();

    if (!panel || !anchorElement) {
      return;
    }

    const observer = new ResizeObserver(updatePosition);
    observer.observe(panel);
    observer.observe(anchorElement);
    onCleanup(() => observer.disconnect());
  });

  return (
    <Portal>
      <div
        ref={(element) => (panel = element)}
        id={props.id}
        class={cn(
          props.variant === "positioner" ? styles.positioner : styles.panel,
          props.class,
        )}
        popover={props.dismissible === false ? undefined : "auto"}
      >
        {props.children}
      </div>
    </Portal>
  );
}
