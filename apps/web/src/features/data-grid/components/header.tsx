import { For } from "solid-js";

import Plus from "~/components/icons/plus";
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
  onAddColumn?: () => void;
  onColumnResizeStart: (
    key: string,
    clientX: number,
    currentWidth: number,
  ) => void;
  onToggleAll?: (checked: boolean) => void;
}) {
  const isInteractive = useDataGridInteractionReady();

  return (
    <div
      class={styles.headerRow}
      style={{ "grid-template-columns": props.gridTemplateColumns }}
    >
      {props.reorderable ? (
        <div class={`${styles.headerCell} ${styles.reorderCell}`} />
      ) : null}
      {props.selectable === false ? null : (
        <div
          class={`${styles.headerCell} ${styles.checkboxCell}`}
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
          const isSticky = () => index() === props.stickyColumnIndex;

          return (
            <div
              class={`${styles.headerCell}${isSticky() ? ` ${styles.stickyCell}` : ""}`}
              style={isSticky() ? { left: `${props.stickyLeft}px` } : undefined}
            >
              <span class={styles.headerCellContent}>
                <span class={styles.headerIcon}>
                  <Icon size={14} />
                </span>
                <span>{column.label}</span>
              </span>
              <div
                class={styles.resizeHandle}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const cell = e.currentTarget.parentElement;
                  props.onColumnResizeStart(
                    column.key,
                    e.clientX,
                    cell?.offsetWidth ?? 150,
                  );
                }}
              />
            </div>
          );
        }}
      </For>
      {props.onAddColumn ? (
        <div class={`${styles.headerCell} ${styles.addColumnCell}`}>
          <button
            type="button"
            class={styles.addColumnButton}
            onClick={props.onAddColumn}
            aria-label="Agregar columna"
          >
            <Plus size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
