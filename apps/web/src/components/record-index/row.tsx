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
      role="row"
      style={{ "grid-template-columns": props.gridTemplateColumns }}
      onClick={() => props.onRowClick(props.row)}
    >
      <div
        class={`${styles.bodyCell} ${styles.checkboxCell}`}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={() => props.onSelectionPointerDown(props.row.id)}
        onPointerEnter={() => props.onSelectionPointerEnter(props.row.id)}
      >
        <Checkbox
          checked={props.selected}
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
            {column.render(props.row)}
          </div>
        )}
      </For>
    </div>
  );
}
