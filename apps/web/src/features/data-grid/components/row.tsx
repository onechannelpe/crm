import { For } from "solid-js";

import { Checkbox } from "~/components/ui/input/checkbox";

import { useDataGridInstance } from "../context/instance-context";
import type { DataGridRowOpen } from "../model/row-open";
import type { DataGridColumn } from "../model/types";
import { DataGridCell } from "./cell";

import styles from "../styles/data-grid.module.css";

export function DataGridRow<T extends { id: number }>(props: {
  columns: DataGridColumn<T>[];
  gridTemplateColumns: string;
  selectable?: boolean;
  row: T;
  rowOpen: DataGridRowOpen<T>;
  stickyColumnIndex: number;
  stickyLeft: number;
}) {
  const interaction = useDataGridInstance();

  return (
    <div
      class={styles.bodyRow}
      data-focused={interaction.isRowFocused(props.row.id) ? "true" : "false"}
      style={{ "grid-template-columns": props.gridTemplateColumns }}
    >
      {props.selectable === false ? null : (
        <div
          class={`${styles.bodyCell} ${styles.checkboxCell}`}
          data-selection-cell="true"
          role="presentation"
          onPointerDown={() => interaction.beginSelectionDrag?.(props.row.id)}
          onPointerEnter={() => interaction.updateSelectionDrag?.(props.row.id)}
        >
          <Checkbox
            checked={interaction.isSelected(props.row.id)}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) =>
              interaction.setSelected?.(
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
                ref={(element) =>
                  interaction.registerCellElement(
                    props.row.id,
                    index(),
                    element,
                  )
                }
                type="button"
                class={styles.rowButton}
                data-grid-focusable-cell={`${props.row.id}:${index()}`}
                onClick={() => props.rowOpen.open(props.row)}
                onFocus={() => interaction.focusCell(props.row.id, index())}
                onKeyDown={(event) =>
                  interaction.handleCellKeyDown(event, props.row.id, index())
                }
                tabIndex={interaction.getCellTabIndex(props.row.id, index())}
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
