import { For } from "solid-js";

import { Checkbox } from "~/components/ui/input/checkbox";

import type { DataGridColumn } from "../model/data-grid-types";
import { DataGridCell } from "./data-grid-cell";

import styles from "../styles/data-grid.module.css";

export function DataGridRow<T extends { id: number }>(props: {
  columns: DataGridColumn<T>[];
  gridTemplateColumns: string;
  onRowClick: (row: T) => void;
  onSelectionPointerDown: (id: number) => void;
  onSelectionPointerEnter: (id: number) => void;
  onToggleSelected: (id: number, checked: boolean) => void;
  row: T;
  selected: boolean;
  stickyColumnIndex: number;
  stickyLeft: number;
}) {
  return (
    <div
      class={styles.bodyRow}
      style={{ "grid-template-columns": props.gridTemplateColumns }}
    >
      <div
        class={`${styles.bodyCell} ${styles.checkboxCell}`}
        data-selection-cell="true"
        onPointerDown={() => props.onSelectionPointerDown(props.row.id)}
        onPointerEnter={() => props.onSelectionPointerEnter(props.row.id)}
      >
        <Checkbox
          checked={props.selected}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) =>
            props.onToggleSelected(props.row.id, event.currentTarget.checked)
          }
        />
      </div>
      <For each={props.columns}>
        {(column, index) => (
          <DataGridCell
            sticky={index() === props.stickyColumnIndex}
            stickyLeft={props.stickyLeft}
          >
            <button
              type="button"
              class={styles.rowButton}
              onClick={() => props.onRowClick(props.row)}
            >
              {column.renderCell(props.row)}
            </button>
          </DataGridCell>
        )}
      </For>
    </div>
  );
}
