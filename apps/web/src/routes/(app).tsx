import type { RouteSectionProps } from "@solidjs/router";

import { AuthenticatedAppShell } from "~/components/layout/app-shell/authenticated-app-shell";
import { AuthenticatedSessionProvider } from "~/components/providers/authenticated-session-provider";
import { traceSsrBoundary } from "~/lib/observability/diagnostics/server";

export default function AppLayout(props: RouteSectionProps) {
  traceSsrBoundary("app-layout", "layout_render");

  return (
    <AuthenticatedSessionProvider>
      <AuthenticatedAppShell {...props} />
    </AuthenticatedSessionProvider>
  );
}
