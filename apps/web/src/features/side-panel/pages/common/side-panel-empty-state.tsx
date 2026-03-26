import type { ParentProps } from "solid-js";

import styles from "./side-panel-empty-state.module.css";

export function SidePanelEmptyState(props: ParentProps) {
  return <div class={styles.emptyState}>{props.children}</div>;
}
