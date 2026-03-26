import type { RouteSectionProps } from "@solidjs/router";

import { AuthenticatedShell } from "~/components/layout/authenticated-shell";
import { SessionProvider } from "~/components/providers/session-provider";
import { traceSsrBoundary } from "~/lib/observability/diagnostics";

export default function AppLayout(props: RouteSectionProps) {
  traceSsrBoundary("app-layout", "layout_render");

  return (
    <SessionProvider>
      <AuthenticatedShell {...props} />
    </SessionProvider>
  );
}
