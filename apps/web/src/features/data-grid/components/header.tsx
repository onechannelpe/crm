import { For } from "solid-js";

import { Checkbox } from "~/components/ui/input/checkbox";

import { useDataGridInteractionReady } from "../context/interaction-context";
import type { DataGridColumn } from "../model/types";

import styles from "../styles/data-grid.module.css";

export function DataGridHeader<T>(props: {
  columns: DataGridColumn<T>[];
  gridTemplateColumns: string;
  reorderable: boolean;
  selectionLeft: number;
  selectable?: boolean;
  allSelected?: boolean;
  stickyColumnIndex: number;
  stickyLeft: number;
  onToggleAll?: (checked: boolean) => void;
}) {
  const isInteractive = useDataGridInteractionReady();

  return (
    <div
      class={styles.headerRow}
      role="row"
      style={{ "grid-template-columns": props.gridTemplateColumns }}
    >
      {props.reorderable ? (
        <div
          class={`${styles.headerCell} ${styles.reorderCell}`}
          role="columnheader"
          aria-colindex={1}
        />
      ) : null}
      {props.selectable === false ? null : (
        <div
          class={`${styles.headerCell} ${styles.checkboxCell}`}
          role="columnheader"
          aria-colindex={props.reorderable ? 2 : 1}
          style={
            props.reorderable ? { left: `${props.selectionLeft}px` } : undefined
          }
        >
          <Checkbox
            checked={props.allSelected ?? false}
            disabled={!isInteractive()}
            onChange={(event: Event & { currentTarget: HTMLInputElement }) =>
              props.onToggleAll?.(event.currentTarget.checked)
            }
          />
        </div>
      )}
      <For each={props.columns}>
        {(column, index) => {
          const Icon = column.icon;
          const colIndex = () =>
            index() + (props.selectable ? 2 : 1) + (props.reorderable ? 1 : 0);

          return (
            <div
              class={`${styles.headerCell} ${index() === props.stickyColumnIndex ? styles.stickyCell : ""}`}
              role="columnheader"
              aria-colindex={colIndex()}
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
