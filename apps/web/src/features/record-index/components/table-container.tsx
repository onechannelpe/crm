import { Show } from "solid-js";

import Plus from "~/components/icons/plus";
import { DataGrid } from "~/features/data-grid/components/grid";
import type { DataGridActionRowConfig } from "~/features/data-grid/model/types";

import type { RecordIndexScreenModel } from "../model/model";
import { RecordIndexEmpty } from "./empty";

export function RecordIndexTableContainer<T extends { id: string }>(props: {
  model: RecordIndexScreenModel<T>;
}) {
  const source = () => props.model.source();
  const loadingStatus = () => source().status;
  const buildActionRow = (): DataGridActionRowConfig | undefined => {
    const createAction = props.model.adapter.createAction;

    if (!createAction || source().rows.length === 0) {
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
    columns: props.model.visibleColumns(),
    emptyState: <></>,
    source: source(),
    pagination: props.model.adapter.pagination
      ? {
          currentPage: props.model.adapter.pagination.currentPage(),
          pageSize: props.model.adapter.pagination.pageSize,
          totalCount: props.model.adapter.pagination.totalCount(),
          onNextPage: props.model.adapter.pagination.onNextPage,
          onPreviousPage: props.model.adapter.pagination.onPreviousPage,
        }
      : undefined,
    reorder: props.model.adapter.reorder,
    rowOpen: props.model.adapter.rowOpen,
    selection: props.model.selection,
    suspendEscapeSelectionClear:
      props.model.context.columns.openMenu() !== null,
  });

  return (
    <Show
      when={loadingStatus() === "ready" && source().rows.length === 0}
      fallback={
        <DataGrid
          {...commonGridProps()}
          actionRow={loadingStatus() === "ready" ? buildActionRow() : undefined}
        />
      }
    >
      <RecordIndexEmpty model={props.model} />
    </Show>
  );
}
