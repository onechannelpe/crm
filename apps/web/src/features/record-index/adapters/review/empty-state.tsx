import { EmptyState } from "~/components/feedback/empty-state";
import Info from "~/components/icons/info";

export function ReviewRecordIndexEmptyState() {
  return (
    <EmptyState
      icon={Info}
      title="No hay leads pendientes de revisión"
      description="Los leads listos para revisión aparecerán aquí."
    />
  );
}
