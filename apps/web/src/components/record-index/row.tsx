import { For } from "solid-js";

import { Checkbox } from "~/components/ui/input/checkbox";

import type { IndexColumn } from "./types";

import styles from "./styles.module.css";

export function IndexRow<T extends { id: number }>(props: {
  columns: IndexColumn<T>[];
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
          <div
            class={`${styles.bodyCell} ${index() === props.stickyColumnIndex ? styles.stickyCell : ""}`}
            style={
              index() === props.stickyColumnIndex
                ? { left: `${props.stickyLeft}px` }
                : undefined
            }
          >
            <button
              type="button"
              class={styles.rowButton}
              onClick={() => props.onRowClick(props.row)}
            >
              {column.render(props.row)}
            </button>
          </div>
        )}
      </For>
    </div>
  );
}
