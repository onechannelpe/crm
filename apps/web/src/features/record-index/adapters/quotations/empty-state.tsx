import { EmptyState } from "~/components/feedback/empty-state";
import Building2 from "~/components/icons/building-2";

export function QuotationsRecordIndexEmptyState() {
  return (
    <EmptyState
      icon={Building2}
      title="No hay leads listos para cotizar"
      description="Los leads preparados para cotización aparecerán aquí."
    />
  );
}
