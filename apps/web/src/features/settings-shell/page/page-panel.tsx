import type { ParentProps } from "solid-js";

import styles from "./page-panel.module.css";

export function PagePanel(props: ParentProps) {
  return <div class={styles.panel}>{props.children}</div>;
}
