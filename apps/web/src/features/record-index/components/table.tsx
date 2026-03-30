import { DataGrid } from "~/features/data-grid/components/grid";

import type { RecordIndexScreenModel } from "../model/types";

export function RecordIndexTable<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(props: { model: RecordIndexScreenModel<T, TFilterValue, TSortValue> }) {
  return (
    <DataGrid
      actionRow={props.model.adapter.actionRow}
      ariaLabel={props.model.adapter.ariaLabel}
      columns={props.model.columns.visibleColumns()}
      draftRow={props.model.draftRow()}
      emptyState={props.model.adapter.emptyState}
      rowOpen={props.model.adapter.rowOpen}
      rows={props.model.sorting.sortedRows()}
      selection={props.model.selection}
    />
  );
}
