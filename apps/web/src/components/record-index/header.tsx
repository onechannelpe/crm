import { For } from "solid-js";

import { Checkbox } from "~/components/ui/input/checkbox";

import type { IndexColumn } from "./types";

import styles from "./styles.module.css";

export function IndexHeader<T>(props: {
  allSelected: boolean;
  columns: IndexColumn<T>[];
  gridTemplateColumns: string;
  stickyColumnIndex: number;
  stickyLeft: number;
  onToggleAll: (checked: boolean) => void;
}) {
  return (
    <div
      class={styles.headerRow}
      role="row"
      style={{ "grid-template-columns": props.gridTemplateColumns }}
    >
      <div
        class={`${styles.headerCell} ${styles.checkboxCell}`}
        role="columnheader"
      >
        <Checkbox
          checked={props.allSelected}
          onChange={(event: Event & { currentTarget: HTMLInputElement }) =>
            props.onToggleAll(event.currentTarget.checked)
          }
        />
      </div>
      <For each={props.columns}>
        {(column, index) => {
          const Icon = column.icon;
          return (
            <div
              class={`${styles.headerCell} ${index() === props.stickyColumnIndex ? styles.stickyCell : ""}`}
              role="columnheader"
              style={
                index() === props.stickyColumnIndex
                  ? { left: `${props.stickyLeft}px` }
                  : undefined
              }
            >
              <span class={styles.headerCellContent}>
                <span class={styles.headerIcon}>
                  <Icon size={14} />
                </span>
                <span>{column.label}</span>
              </span>
            </div>
          );
        }}
      </For>
    </div>
  );
}
