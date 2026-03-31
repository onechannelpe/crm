import { DataGrid } from "~/features/data-grid/components/grid";

import type { RecordIndexScreenModel } from "../model/types";
import { RecordIndexEmpty } from "./empty";

export function RecordIndexTableContainer<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(props: { model: RecordIndexScreenModel<T, TFilterValue, TSortValue> }) {
  const rows = () => props.model.sorting.sortedRows();

  if (props.model.loading.isInitial()) {
    return (
      <DataGrid
        ariaLabel={props.model.adapter.ariaLabel}
        columns={props.model.columns.visibleColumns()}
        emptyState={<></>}
        isLoading={true}
        reorder={props.model.adapter.reorder}
        rowOpen={props.model.adapter.rowOpen}
        rows={[]}
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
      isLoading={false}
      reorder={props.model.adapter.reorder}
      rowOpen={props.model.adapter.rowOpen}
      rows={rows()}
      selection={props.model.selection}
      suspendEscapeSelectionClear={props.model.columns.openMenu() !== null}
    />
  );
}
