import { EmptyState } from "~/components/feedback/empty-state";
import CalendarDays from "~/components/icons/calendar-days";
import { AppPage } from "~/components/layout/page";

export default function SchedulePage() {
  return (
    <AppPage>
      <EmptyState
        icon={CalendarDays}
        title="Sin eventos próximos"
        description="Tus citas y eventos programados aparecerán aquí."
      />
    </AppPage>
  );
}
