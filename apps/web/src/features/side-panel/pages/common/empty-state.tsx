import type { ParentProps } from "solid-js";

import styles from "./empty-state.module.css";

export function SidePanelEmptyState(props: ParentProps) {
  return <div class={styles.emptyState}>{props.children}</div>;
}
