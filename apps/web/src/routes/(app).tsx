import type { RouteDefinition, RouteSectionProps } from "@solidjs/router";

import { traceDiagnostic } from "~/browser/observability/diagnostics/core";
import { AppShell } from "~/components/layout/app-shell/app-shell";
import { AuthenticatedAppFrame } from "~/components/layout/app-shell/authenticated-app-frame";
import { meQuery } from "~/features/auth/data/queries/me";

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
