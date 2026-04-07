import { useDataGridInteractionReady } from "../context/interaction-context";
import type { DataGridIcon } from "../model/types";

import styles from "../styles/data-grid.module.css";

export function DataGridActionRow(props: {
  gridTemplateColumns: string;
  icon: DataGridIcon;
  label: string;
  labelColumnIndex: number;
  onClick: () => void;
  reorderable: boolean;
  selectionLeft: number;
  stickyColumnIndex: number;
  stickyLeft: number;
}) {
  const Icon = props.icon;
  const isInteractive = useDataGridInteractionReady();

  return (
    <button
      type="button"
      class={styles.actionRow}
      disabled={!isInteractive()}
      style={{ "grid-template-columns": props.gridTemplateColumns }}
      onClick={props.onClick}
    >
      {props.reorderable ? (
        <div class={`${styles.actionCell} ${styles.reorderCell}`} />
      ) : null}
      <div
        class={`${styles.actionCell} ${styles.checkboxCell}`}
        style={
          props.reorderable ? { left: `${props.selectionLeft}px` } : undefined
        }
      >
        <span class={styles.actionIcon} aria-hidden="true">
          <Icon size={14} />
        </span>
      </div>
      <div
        class={`${styles.actionCell} ${props.labelColumnIndex === props.stickyColumnIndex ? styles.stickyCell : ""}`}
        style={{
          "grid-column": `${props.labelColumnIndex + (props.reorderable ? 3 : 2)} / ${props.labelColumnIndex + (props.reorderable ? 4 : 3)}`,
          ...(props.labelColumnIndex === props.stickyColumnIndex
            ? { left: `${props.stickyLeft}px` }
            : {}),
        }}
      >
        <span class={styles.actionText}>{props.label}</span>
      </div>
    </button>
  );
}
