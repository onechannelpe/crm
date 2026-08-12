import type { RouteSectionProps } from "@solidjs/router";
import { Suspense } from "solid-js";

import { PageCardLayout } from "~/components/ui/layout/page-card/page-card-layout";

import { RecordIndexShellSkeleton } from "./skeletons/record-index-shell-skeleton";

export function RecordIndexAppShell(props: RouteSectionProps) {
  return (
    <PageCardLayout>
      <Suspense fallback={<RecordIndexShellSkeleton />}>
        {props.children}
      </Suspense>
    </PageCardLayout>
  );
}
