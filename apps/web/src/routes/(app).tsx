import type { RouteSectionProps } from "@solidjs/router";

import { AuthenticatedAppShell } from "~/components/layout/app-shell/authenticated-app-shell";
import { AuthenticatedSessionProvider } from "~/components/providers/authenticated-session-provider";
import { traceDiagnostic } from "~/lib/observability/diagnostics/core";

export default function AppLayout(props: RouteSectionProps) {
  traceDiagnostic("app-layout", "ssr", "layout_render");

  return (
    <AuthenticatedSessionProvider>
      <AuthenticatedAppShell {...props} />
    </AuthenticatedSessionProvider>
  );
}
