import { Show } from "solid-js";
import { Dynamic } from "solid-js/web";

import { useDataGrid } from "../context/instance-context";
import type { DataGridActionRowConfig } from "../model/types";

import styles from "../styles/table.module.css";

function getLabelGridColumn(
  labelColumnIndex: number,
  leadingColumnCount: number,
) {
  const start = labelColumnIndex + 1 + leadingColumnCount;
  return `${start} / ${start + 1}`;
}

export function DataGridActionRow(props: {
  ariaRowIndex: number;
  config: DataGridActionRowConfig;
  labelColumnIndex: number;
  stickyColumnIndex: number;
}) {
  const grid = useDataGrid();

  return (
    <div class={styles.actionRow} role="row" aria-rowindex={props.ariaRowIndex}>
      <Show when={grid.reorder}>
        <span
          class={`${styles.actionCell} ${styles.reorderCell}`}
          aria-hidden="true"
          role="presentation"
        />
      </Show>
      <Show when={grid.selection}>
        <span
          class={`${styles.actionCell} ${styles.checkboxCell}`}
          aria-hidden="true"
          role="presentation"
        >
          <span class={styles.actionIcon} aria-hidden="true">
            <Dynamic component={props.config.icon} size={14} />
          </span>
        </span>
      </Show>
      <span
        aria-label={props.config.label}
        class={`${styles.actionCell} ${props.labelColumnIndex === props.stickyColumnIndex ? styles.stickyCell : ""}`}
        style={{
          "grid-column": getLabelGridColumn(
            props.labelColumnIndex,
            Number(grid.reorder !== undefined) +
              Number(grid.selection !== undefined),
          ),
        }}
        role="gridcell"
      >
        <Show when={!grid.selection}>
          <span class={styles.actionIcon} aria-hidden="true">
            <Dynamic component={props.config.icon} size={14} />
          </span>
        </Show>
        <button
          type="button"
          class={styles.actionButton}
          disabled={!grid.isInteractive()}
          onClick={props.config.onClick}
        >
          <span class={styles.actionText}>{props.config.label}</span>
        </button>
      </span>
    </div>
  );
}
