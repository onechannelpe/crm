import type { RouteSectionProps } from "@solidjs/router";

import { AppShell } from "~/components/layout/app-shell/app-shell";
import { AuthenticatedAppFrame } from "~/components/layout/app-shell/authenticated-app-frame";
import { traceDiagnostic } from "~/lib/observability/diagnostics/core";

export default function AppLayout(props: RouteSectionProps) {
  traceDiagnostic("app-layout", "ssr", "layout_render");

  return (
    <AuthenticatedAppFrame>
      <AppShell {...props} />
    </AuthenticatedAppFrame>
  );
}
