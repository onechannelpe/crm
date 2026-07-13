import type { RouteSectionProps } from "@solidjs/router";

import { AuthenticatedAppFrame } from "~/components/layout/app-shell/authenticated-app-frame";
import { RecordIndexAppShell } from "~/components/layout/app-shell/record-index-app-shell";
import { traceDiagnostic } from "~/lib/observability/diagnostics/core";

export default function RecordIndexLayout(props: RouteSectionProps) {
  traceDiagnostic("record-index-layout", "ssr", "layout_render");

  return (
    <AuthenticatedAppFrame>
      <RecordIndexAppShell {...props} />
    </AuthenticatedAppFrame>
  );
}
