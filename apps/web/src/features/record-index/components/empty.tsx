import { EmptyState } from "~/components/feedback/empty-state/empty";
import Plus from "~/components/icons/plus";
import { Button } from "~/components/ui/input/button";

import { useRecordIndex } from "../context/record-index-context";

export function RecordIndexEmpty() {
  const recordIndex = useRecordIndex();
  const createAction = () => recordIndex.definition.createAction;
  const shouldShowCreateAction = () => {
    const total = recordIndex.counts.total();
    return createAction() !== undefined && (total === undefined || total === 0);
  };

  return (
    <EmptyState
      icon={recordIndex.definition.emptyState.icon}
      title={recordIndex.definition.emptyState.title}
      description={recordIndex.definition.emptyState.description}
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
  );
}
