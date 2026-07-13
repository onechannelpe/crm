import { Key } from "@solid-primitives/keyed";
import { Show } from "solid-js";

import type {
  DataGridActionRowConfig,
  DataGridColumn,
  DataGridRowOpenIndicator,
} from "../model/types";
import { DataGridActionRow } from "./action-row";
import { DataGridRow } from "./row";

export function DataGridBody<T extends { id: string }>(props: {
  actionRow?: DataGridActionRowConfig;
  columns: ReadonlyArray<DataGridColumn<T>>;
  onRowOpen?: (row: T) => void;
  rowOpenIndicator?: DataGridRowOpenIndicator;
  rowIndexOffset: number;
  rows: ReadonlyArray<T>;
  stickyColumnIndex: number;
  totalRowCount: number;
}) {
  return (
    <>
      <Key each={props.rows} by="id">
        {(row, index) => (
          <DataGridRow
            columns={props.columns}
            onRowOpen={props.onRowOpen}
            row={row()}
            rowOpenIndicator={props.rowOpenIndicator}
            ariaRowIndex={props.rowIndexOffset + index() + 2}
            rowOrderIndex={index()}
            stickyColumnIndex={props.stickyColumnIndex}
          />
        )}
      </Key>

      <Show when={props.actionRow}>
        {(action) => (
          <DataGridActionRow
            config={action()}
            ariaRowIndex={props.totalRowCount + 2}
            labelColumnIndex={Math.max(props.stickyColumnIndex, 0)}
            stickyColumnIndex={props.stickyColumnIndex}
          />
        )}
      </Show>
    </>
  );
}
