import { EmptyState } from "~/components/feedback/empty-state";
import Plus from "~/components/icons/plus";
import { Button } from "~/components/ui/input/button";
import { DataGrid } from "~/features/data-grid/components/grid";
import { createNoopRowOpen } from "~/features/data-grid/model/row-open";

import type { RecordIndexScreenModel } from "../model/types";

export function RecordIndexEmpty<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(props: { model: RecordIndexScreenModel<T, TFilterValue, TSortValue> }) {
  return (
    <DataGrid
      ariaLabel={props.model.adapter.ariaLabel}
      columns={props.model.columns.visibleColumns()}
      emptyState={
        <EmptyState
          icon={props.model.adapter.emptyState.icon}
          title={props.model.adapter.emptyState.title}
          description={props.model.adapter.emptyState.description}
          action={
            props.model.adapter.createAction ? (
              <Button onClick={props.model.adapter.createAction.onClick}>
                <Plus size={14} />
                {props.model.adapter.createAction.label}
              </Button>
            ) : undefined
          }
        />
      }
      source={{ status: "ready", rows: [] }}
      rowOpen={createNoopRowOpen<T>()}
      selection={props.model.selection}
      suspendEscapeSelectionClear={props.model.columns.openMenu() !== null}
    />
  );
}
