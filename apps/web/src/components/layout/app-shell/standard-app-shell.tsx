import type { RouteSectionProps } from "@solidjs/router";
import { Suspense } from "solid-js";

import { AppHeader } from "~/components/layout/app-header/app-header";
import { PageCardLayout } from "~/components/ui/layout/page-card/page-card-layout";

import { StandardShellSkeleton } from "./skeletons/standard-shell-skeleton";

export function StandardAppShell(props: RouteSectionProps) {
  return (
    <PageCardLayout header={<AppHeader />}>
      <Suspense fallback={<StandardShellSkeleton />}>{props.children}</Suspense>
    </PageCardLayout>
  );
}
