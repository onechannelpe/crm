import type { JSX } from "solid-js";

import type { WidgetSpan } from "./types";

import styles from "./dashboard-grid.module.css";

export function DashboardGrid(props: { children: JSX.Element }) {
  return <div class={styles.grid}>{props.children}</div>;
}

export function GridItem(props: { span: WidgetSpan; children: JSX.Element }) {
  return (
    <div classList={{ [styles.item]: true, [styles[props.span]]: true }}>
      {props.children}
    </div>
  );
}
