import Plus from "~/components/icons/plus";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridActionRowConfig } from "~/features/data-grid/model/types";

import type { RecordIndexScreenModel } from "../model/types";
import { RecordIndexEmpty } from "./empty";

export function RecordIndexTableContainer<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(props: { model: RecordIndexScreenModel<T, TFilterValue, TSortValue> }) {
  const sortedRows = () => props.model.sorting.sortedRows();
  const gridSource = () => props.model.source.grid();
  const loadingStatus = () => props.model.loading.status();
  const buildActionRow = (): DataGridActionRowConfig | undefined => {
    const createAction = props.model.adapter.createAction;

    if (!createAction || sortedRows().length === 0) {
      return undefined;
    }

    return {
      icon: createAction.icon ?? Plus,
      label: createAction.inlineLabel ?? createAction.label,
      onClick: createAction.onClick,
    };
  };

  const commonGridProps = () => ({
    ariaLabel: props.model.adapter.ariaLabel,
    columns: props.model.columns.visibleColumns(),
    emptyState: <></>,
    source: gridSource(),
    reorder: props.model.adapter.reorder,
    rowOpen: props.model.adapter.rowOpen,
    selection: props.model.selection,
    suspendEscapeSelectionClear: props.model.columns.openMenu() !== null,
  });

  if (loadingStatus() === "ready" && sortedRows().length === 0) {
    return <RecordIndexEmpty model={props.model} />;
  }

  return (
    <DataGrid
      {...commonGridProps()}
      actionRow={loadingStatus() === "ready" ? buildActionRow() : undefined}
    />
  );
}
