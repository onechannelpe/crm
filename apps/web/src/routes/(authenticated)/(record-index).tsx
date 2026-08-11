import type { RouteSectionProps } from "@solidjs/router";

import { RecordIndexAppShell } from "~/components/layout/app-shell/record-index-app-shell";

export default function RecordIndexLayout(props: RouteSectionProps) {
  return <RecordIndexAppShell {...props} />;
}
