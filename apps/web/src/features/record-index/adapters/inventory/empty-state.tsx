import { EmptyState } from "~/components/feedback/empty-state";
import Package from "~/components/icons/package";

export function InventoryRecordIndexEmptyState() {
  return (
    <EmptyState
      icon={Package}
      title="Sin registros de inventario"
      description="Los artículos aparecerán aquí cuando estén disponibles."
    />
  );
}
