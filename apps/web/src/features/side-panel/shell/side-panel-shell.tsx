import {
  type JSX,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

import { cn } from "~/lib/utils";

import {
  SIDE_PANEL_CLICK_OUTSIDE_ID,
  SIDE_PANEL_EXCLUDED_CLICK_OUTSIDE_IDS,
} from "../constants/side-panel-click-outside-id";
import { useSidePanel } from "../state/use-side-panel";

import styles from "./side-panel-shell.module.css";

type SidePanelShellProps = {
  renderContent?: () => JSX.Element;
  isResizing?: boolean;
  isInteractive?: boolean;
  shouldRenderChildren?: boolean;
};

export function SidePanelShell(props: SidePanelShellProps) {
  const { isOpen, isClosing, closePanel, onCloseAnimationComplete } =
    useSidePanel();
  const [shouldRenderContent, setShouldRenderContent] = createSignal(isOpen());

  createEffect(() => {
    if (isOpen()) {
      setShouldRenderContent(true);
    }
  });

  function handleTransitionEnd(event: TransitionEvent) {
    if (event.propertyName === "width" && !isOpen() && isClosing()) {
      setShouldRenderContent(false);
      onCloseAnimationComplete();
    }
  }

  onMount(() => {
    function handlePointerDown(e: PointerEvent) {
      if (props.isInteractive === false) return;
      if (!isOpen()) return;
      const path = e.composedPath();
      const isExcluded = path.some((el) => {
        if (!(el instanceof Element)) return false;
        const id = el.getAttribute("data-click-outside-id");
        return (
          id !== null && SIDE_PANEL_EXCLUDED_CLICK_OUTSIDE_IDS.includes(id)
        );
      });
      if (!isExcluded) {
        closePanel();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    onCleanup(() =>
      document.removeEventListener("pointerdown", handlePointerDown),
    );
  });

  return (
    <div
      class={cn(
        styles.wrapper,
        isOpen() && styles.wrapperOpen,
        props.isResizing && styles.wrapperResizing,
      )}
      data-click-outside-id={SIDE_PANEL_CLICK_OUTSIDE_ID}
      onTransitionEnd={handleTransitionEnd}
    >
      <aside class={styles.aside}>
        <Show
          when={
            props.shouldRenderChildren !== false &&
            (isOpen() || shouldRenderContent())
          }
        >
          {props.renderContent?.()}
        </Show>
      </aside>
    </div>
  );
}
