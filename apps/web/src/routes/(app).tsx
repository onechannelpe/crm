import type { RouteDefinition, RouteSectionProps } from "@solidjs/router";

import { AppShell } from "~/components/layout/app-shell/app-shell";
import { AuthenticatedAppFrame } from "~/components/layout/app-shell/authenticated-app-frame";
import { traceDiagnostic } from "~/lib/observability/diagnostics/core";
import { meQuery } from "~/lib/queries/auth";

export const route = {
  preload: () => meQuery(),
} satisfies RouteDefinition;

export default function AppLayout(props: RouteSectionProps) {
  traceDiagnostic("app-layout", "ssr", "layout_render");

  return (
    <AuthenticatedAppFrame>
      <AppShell {...props} />
    </AuthenticatedAppFrame>
  );
}
