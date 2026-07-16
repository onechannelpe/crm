import type { JSX } from "solid-js";

import styles from "./widget-layout.module.css";

export type WidgetSpan = "quarter" | "half" | "full";

export function WidgetGrid(props: { children: JSX.Element }) {
  return <div class={styles.grid}>{props.children}</div>;
}

export function WidgetStatGrid(props: { children: JSX.Element }) {
  return <div class={styles.statGrid}>{props.children}</div>;
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

export function WidgetStack(props: { children: JSX.Element }) {
  return <div class={styles.stack}>{props.children}</div>;
}
