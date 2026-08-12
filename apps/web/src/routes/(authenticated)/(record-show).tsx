import type { RouteSectionProps } from "@solidjs/router";

import { RecordShowShell } from "~/components/layout/app-shell/record-show-shell";

export default function RecordShowLayout(props: RouteSectionProps) {
  return <RecordShowShell {...props} />;
}
