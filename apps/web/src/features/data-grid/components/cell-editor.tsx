import { createEffect, onCleanup, type Accessor, type JSX } from "solid-js";
import { Portal } from "solid-js/web";

import styles from "../styles/data-grid.module.css";

const VIEWPORT_PADDING = 8;

export function DataGridCellEditor(props: {
  anchor: Accessor<HTMLElement | undefined>;
  onClose: () => void;
  children: JSX.Element;
}) {
  let editorRef: HTMLDivElement | undefined;

  createEffect(() => {
    const anchor = props.anchor();
    if (!anchor || typeof window === "undefined") {
      return;
    }

    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      const width = Math.max(rect.width, editorRef?.offsetWidth ?? rect.width);
      const height = editorRef?.offsetHeight ?? rect.height;

      const left = Math.max(
        VIEWPORT_PADDING,
        Math.min(rect.left, window.innerWidth - width - VIEWPORT_PADDING),
      );
      const fitsBelow =
        rect.top + height <= window.innerHeight - VIEWPORT_PADDING;
      const top = fitsBelow
        ? rect.top
        : Math.max(
            VIEWPORT_PADDING,
            window.innerHeight - height - VIEWPORT_PADDING,
          );

      if (editorRef) {
        editorRef.style.top = `${top}px`;
        editorRef.style.left = `${left}px`;
        editorRef.style.minWidth = `${rect.width}px`;
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    onCleanup(() => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    });
  });

  // Dismiss on any pointer press outside the editor. Capture phase so the click
  // that would otherwise open a row or focus another cell triggers dismissal
  // first. Escape is intentionally left to each editor because text and select
  // editors have different commit rules.
  createEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (editorRef && target instanceof Node && !editorRef.contains(target)) {
        props.onClose();
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);

    onCleanup(() => {
      document.removeEventListener("pointerdown", onPointerDown, true);
    });
  });

  return (
    <Portal>
      {/* The Portal lets editors overflow cells and the scroll container. */}
      <div
        ref={(el) => (editorRef = el)}
        class={styles.cellEditor}
        role="presentation"
      >
        {props.children}
      </div>
    </Portal>
  );
}
