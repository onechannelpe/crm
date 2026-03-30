import { For } from "solid-js";

import type { DataGridRowOpen } from "../model/row-open";
import type { DataGridActionRowConfig, DataGridColumn } from "../model/types";
import { DataGridActionRow } from "./action-row";
import { DataGridRow } from "./row";

export function DataGridBody<T extends { id: number }>(props: {
  actionRow?: DataGridActionRowConfig;
  columns: DataGridColumn<T>[];
  gridTemplateColumns: string;
  rowOpen: DataGridRowOpen<T>;
  rows: T[];
  selectable: boolean;
  stickyColumnIndex: number;
  stickyLeft: number;
}) {
  return (
    <>
      <For each={props.rows}>
        {(row) => (
          <DataGridRow
            columns={props.columns}
            gridTemplateColumns={props.gridTemplateColumns}
            selectable={props.selectable}
            row={row}
            rowOpen={props.rowOpen}
            stickyColumnIndex={props.stickyColumnIndex}
            stickyLeft={props.stickyLeft}
          />
        )}
      </For>

      {props.actionRow ? (
        <DataGridActionRow
          gridTemplateColumns={props.gridTemplateColumns}
          icon={props.actionRow.icon}
          label={props.actionRow.label}
          labelColumnIndex={Math.max(props.stickyColumnIndex, 0)}
          onClick={props.actionRow.onClick}
          stickyColumnIndex={props.stickyColumnIndex}
          stickyLeft={props.stickyLeft}
        />
      ) : null}
    </>
  );
}
