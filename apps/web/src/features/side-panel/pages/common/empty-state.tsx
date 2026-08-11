import type { ParentProps } from "solid-js";

import styles from "./empty-state.module.css";

// The one empty line every panel list falls back to: nothing to show yet,
// nothing found, or nothing typed. Errors get their own treatment.
export function EmptyState(props: ParentProps) {
  return <div class={styles.emptyState}>{props.children}</div>;
}
