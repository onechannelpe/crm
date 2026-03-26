import type { RouteSectionProps } from "@solidjs/router";

import { AuthenticatedAppShell } from "~/components/layout/app-shell";
import { SessionProvider } from "~/components/providers/session-provider";
import { traceSsrBoundary } from "~/lib/observability/diagnostics";

export default function AppLayout(props: RouteSectionProps) {
  traceSsrBoundary("app-layout", "layout_render");

  return (
    <SessionProvider>
      <AuthenticatedAppShell {...props} />
    </SessionProvider>
  );
}
