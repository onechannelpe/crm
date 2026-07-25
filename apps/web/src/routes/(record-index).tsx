import type { RouteDefinition, RouteSectionProps } from "@solidjs/router";

import { traceDiagnostic } from "~/browser/observability/diagnostics/core";
import { AuthenticatedAppFrame } from "~/components/layout/app-shell/authenticated-app-frame";
import { RecordIndexAppShell } from "~/components/layout/app-shell/record-index-app-shell";
import { meQuery } from "~/features/auth/data/queries";

export const route = {
  preload: () => meQuery(),
} satisfies RouteDefinition;

export default function RecordIndexLayout(props: RouteSectionProps) {
  traceDiagnostic("record-index-layout", "ssr", "layout_render");

  return (
    <AuthenticatedAppFrame>
      <RecordIndexAppShell {...props} />
    </AuthenticatedAppFrame>
  );
}
