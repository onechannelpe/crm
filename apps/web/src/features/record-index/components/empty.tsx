import { EmptyState } from "~/components/feedback/empty-state/empty";
import Plus from "~/components/icons/plus";
import { Button } from "~/components/ui/input/button";
import { DataGrid } from "~/features/data-grid/components/grid";
import { createNoopRowOpen } from "~/features/data-grid/model/row-open";

import type { RecordIndexScreenModel } from "../model/model";

export function RecordIndexEmpty<T extends { id: string }>(props: {
  model: RecordIndexScreenModel<T>;
}) {
  const createAction = () => props.model.adapter.createAction;
  const shouldShowCreateAction = () => {
    const total = props.model.context.counts.total();

    if (!createAction()) {
      return false;
    }

    if (typeof total !== "number") {
      return true;
    }

    return total === 0;
  };

  return (
    <DataGrid
      ariaLabel={props.model.adapter.ariaLabel}
      columns={props.model.visibleColumns()}
      emptyState={
        <EmptyState
          icon={props.model.adapter.emptyState.icon}
          title={props.model.adapter.emptyState.title}
          description={props.model.adapter.emptyState.description}
          action={
            shouldShowCreateAction() ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => createAction()?.onClick()}
              >
                {(() => {
                  const Icon = createAction()?.icon ?? Plus;
                  return <Icon size={14} />;
                })()}
                {createAction()?.emptyLabel ?? createAction()?.label}
              </Button>
            ) : undefined
          }
        />
      }
      source={{ status: "ready", rows: [] }}
      rowOpen={createNoopRowOpen<T>()}
      selection={props.model.selection}
      suspendEscapeSelectionClear={
        props.model.context.columns.openMenu() !== null
      }
    />
  );
}
