import type { RouteSectionProps } from "@solidjs/router";

import { StandardAppShell } from "~/components/layout/app-shell/standard-app-shell";

export default function AppLayout(props: RouteSectionProps) {
  return <StandardAppShell {...props} />;
}
