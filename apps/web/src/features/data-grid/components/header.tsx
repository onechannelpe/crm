import { For, Show } from "solid-js";

import Plus from "~/components/icons/plus";
import { Checkbox } from "~/components/ui/input/checkbox";

import { useDataGrid } from "../context/instance-context";
import type { DataGridColumn } from "../model/types";

import styles from "../styles/table.module.css";

export function DataGridHeader<T>(props: {
  columns: ReadonlyArray<DataGridColumn<T>>;
  stickyColumnIndex: number;
  onAddColumn?: () => void;
}) {
  const grid = useDataGrid();

  return (
    <div class={styles.headerRow} role="row" aria-rowindex={1}>
      <Show when={grid.reorder}>
        <div
          class={`${styles.headerCell} ${styles.reorderCell}`}
          aria-label="Reordenar filas"
          role="columnheader"
        />
      </Show>
      <Show when={grid.selection}>
        {(selection) => (
          <div
            class={`${styles.headerCell} ${styles.checkboxCell}`}
            role="columnheader"
          >
            <Checkbox
              aria-label="Seleccionar todas las filas"
              checked={selection().allSelected()}
              indeterminate={selection().someSelected()}
              disabled={!grid.isInteractive()}
              onChange={(event) =>
                selection().toggleAll(event.currentTarget.checked)
              }
            />
          </div>
        )}
      </Show>
      <For each={props.columns}>
        {(column, index) => {
          const isSticky = () => index() === props.stickyColumnIndex;

          return (
            <div
              class={`${styles.headerCell}${isSticky() ? ` ${styles.stickyCell}` : ""}`}
              role="columnheader"
            >
              <span class={styles.headerCellContent}>
                <Show when={column.icon} keyed>
                  {(Icon) => (
                    <span class={styles.headerIcon}>
                      <Icon size={16} />
                    </span>
                  )}
                </Show>
                <span>{column.label}</span>
              </span>
              <button
                type="button"
                class={styles.resizeHandle}
                aria-label={`Redimensionar ${column.label}`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  grid.resize.begin({
                    key: column.key,
                    pointerId: event.pointerId,
                    clientX: event.clientX,
                    currentWidth:
                      event.currentTarget.parentElement?.offsetWidth ?? 150,
                  });
                }}
              />
            </div>
          );
        }}
      </For>
      <Show when={props.onAddColumn}>
        {(onAddColumn) => (
          <div
            class={`${styles.headerCell} ${styles.addColumnCell}`}
            role="columnheader"
          >
            <button
              type="button"
              class={styles.addColumnButton}
              onClick={onAddColumn()}
              aria-label="Agregar columna"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </Show>
    </div>
  );
}
