import type { JSX } from "solid-js";

import styles from "./widget-list.module.css";

// 1D vertical layout: widgets stacked full-width. Used by record-page panels and
// side panels.
export function WidgetList(props: { children: JSX.Element }) {
  return <div class={styles.list}>{props.children}</div>;
}
