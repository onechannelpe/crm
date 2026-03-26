import type { JSX } from "solid-js";

import styles from "./styles.module.css";

export function IndexActionRow(props: {
  gridTemplateColumns: string;
  icon: JSX.Element;
  label: string;
  labelColumnIndex: number;
  onClick: () => void;
  stickyColumnIndex: number;
  stickyLeft: number;
}) {
  return (
    <button
      type="button"
      class={styles.actionRow}
      style={{ "grid-template-columns": props.gridTemplateColumns }}
      onClick={props.onClick}
    >
      <div class={`${styles.actionCell} ${styles.checkboxCell}`}>
        {props.icon}
      </div>
      <div
        class={`${styles.actionCell} ${props.labelColumnIndex === props.stickyColumnIndex ? styles.stickyCell : ""}`}
        style={{
          "grid-column": `${props.labelColumnIndex + 2} / ${props.labelColumnIndex + 3}`,
          ...(props.labelColumnIndex === props.stickyColumnIndex
            ? { left: `${props.stickyLeft}px` }
            : {}),
        }}
      >
        {props.label}
      </div>
    </button>
  );
}
