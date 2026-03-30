import { EmptyState } from "~/components/feedback/empty-state";
import Building2 from "~/components/icons/building-2";

export function SalesCrmRecordIndexEmptyState() {
  return (
    <EmptyState
      icon={Building2}
      title="No hay ventas registradas"
      description="Las ventas CRM aparecerán aquí cuando existan registros."
    />
  );
}
