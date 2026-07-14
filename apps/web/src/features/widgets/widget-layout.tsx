import type { JSX } from "solid-js";

import styles from "./widget-layout.module.css";

// Shared layout vocabulary for the widget system. A widget occupies a fraction
// of the dashboard grid's row; the vertical stack ignores span and stacks.
export type WidgetSpan = "quarter" | "half" | "full";

// Dashboard canvas: a responsive CSS grid.
export function WidgetGrid(props: { children: JSX.Element }) {
  return <div class={styles.grid}>{props.children}</div>;
}

export function WidgetGridItem(props: {
  span: WidgetSpan;
  children: JSX.Element;
}) {
  return (
    <div classList={{ [styles.item]: true, [styles[props.span]]: true }}>
      {props.children}
    </div>
  );
}

// Record-page canvas: a vertical stack of widget cards. Mirrors Twenty's
// vertical-list container — a styled wrapper that supplies the inter-card gap,
// nothing more (no dispatch, no ordering state).
export function WidgetStack(props: { children: JSX.Element }) {
  return <div class={styles.stack}>{props.children}</div>;
}
