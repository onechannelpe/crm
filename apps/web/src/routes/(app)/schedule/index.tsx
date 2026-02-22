import { EmptyState } from "~/components/feedback/empty-state";
import CalendarDays from "~/components/icons/calendar-days";
import { AppPage } from "~/components/layout/page";

export default function SchedulePage() {
  return (
    <AppPage>
      <EmptyState
        icon={CalendarDays}
        title="No upcoming events"
        description="Your appointments and scheduled events will appear here."
      />
    </AppPage>
  );
}
