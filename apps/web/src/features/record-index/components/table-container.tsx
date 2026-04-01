import { DataGrid } from "~/features/data-grid/components/grid";

import type { RecordIndexScreenModel } from "../model/types";
import { RecordIndexEmpty } from "./empty";

export function RecordIndexTableContainer<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(props: { model: RecordIndexScreenModel<T, TFilterValue, TSortValue> }) {
  const rows = () => props.model.sorting.sortedRows();
  const source = () => props.model.source.grid();

  if (props.model.loading.status() === "pending") {
    return (
      <DataGrid
        ariaLabel={props.model.adapter.ariaLabel}
        columns={props.model.columns.visibleColumns()}
        emptyState={<></>}
        source={source()}
        reorder={props.model.adapter.reorder}
        rowOpen={props.model.adapter.rowOpen}
        selection={props.model.selection}
        suspendEscapeSelectionClear={props.model.columns.openMenu() !== null}
      />
    );
  }

  if (rows().length === 0) {
    return <RecordIndexEmpty model={props.model} />;
  }

  return (
    <DataGrid
      ariaLabel={props.model.adapter.ariaLabel}
      columns={props.model.columns.visibleColumns()}
      emptyState={<></>}
      source={source()}
      reorder={props.model.adapter.reorder}
      rowOpen={props.model.adapter.rowOpen}
      selection={props.model.selection}
      suspendEscapeSelectionClear={props.model.columns.openMenu() !== null}
    />
  );
}
