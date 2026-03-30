import type { JSX } from "solid-js";

import styles from "../styles/data-grid.module.css";

export function DataGridCell(props: {
  children: JSX.Element;
  class?: string;
  sticky?: boolean;
  stickyLeft?: number;
}) {
  return (
    <div
      class={`${styles.bodyCell}${props.class ? ` ${props.class}` : ""}${props.sticky ? ` ${styles.stickyCell}` : ""}`}
      style={props.sticky ? { left: `${props.stickyLeft ?? 0}px` } : undefined}
    >
      {props.children}
    </div>
  );
}
