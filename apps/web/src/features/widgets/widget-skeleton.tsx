import { Skeleton } from "~/components/ui/feedback/skeleton";

import { WidgetCard, WidgetCardContent, WidgetCardHeader } from "./widget-card";

export function WidgetSkeleton() {
  return (
    <WidgetCard variant="dashboard">
      <WidgetCardHeader>
        <Skeleton width={140} height={12} />
      </WidgetCardHeader>
      <WidgetCardContent>
        <Skeleton height={72} />
      </WidgetCardContent>
    </WidgetCard>
  );
}
