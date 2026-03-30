import { For } from "solid-js";

import { Checkbox } from "~/components/ui/input/checkbox";

import type { DataGridRowOpen } from "../model/row-open";
import type { DataGridColumn } from "../model/types";
import { DataGridCell } from "./cell";

import styles from "../styles/data-grid.module.css";

export function DataGridRow<T extends { id: number }>(props: {
  columns: DataGridColumn<T>[];
  gridTemplateColumns: string;
  selectable?: boolean;
  onSelectionPointerDown?: (id: number) => void;
  onSelectionPointerEnter?: (id: number) => void;
  onToggleSelected?: (id: number, checked: boolean) => void;
  row: T;
  rowOpen: DataGridRowOpen<T>;
  selected?: boolean;
  stickyColumnIndex: number;
  stickyLeft: number;
}) {
  return (
    <div
      class={styles.bodyRow}
      style={{ "grid-template-columns": props.gridTemplateColumns }}
    >
      {props.selectable === false ? null : (
        <div
          class={`${styles.bodyCell} ${styles.checkboxCell}`}
          data-selection-cell="true"
          onPointerDown={() => props.onSelectionPointerDown?.(props.row.id)}
          onPointerEnter={() => props.onSelectionPointerEnter?.(props.row.id)}
        >
          <Checkbox
            checked={props.selected ?? false}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) =>
              props.onToggleSelected?.(
                props.row.id,
                event.currentTarget.checked,
              )
            }
          />
        </div>
      )}
      <For each={props.columns}>
        {(column, index) => (
          <DataGridCell
            sticky={index() === props.stickyColumnIndex}
            stickyLeft={props.stickyLeft}
          >
            {props.rowOpen.mode === "none" ? (
              <div class={styles.rowContent}>
                {column.renderCell(props.row)}
              </div>
            ) : (
              <button
                type="button"
                class={styles.rowButton}
                onClick={() => props.rowOpen.open(props.row)}
              >
                {column.renderCell(props.row)}
              </button>
            )}
          </DataGridCell>
        )}
      </For>
    </div>
  );
}
