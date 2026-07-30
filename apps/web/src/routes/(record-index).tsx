import type { RouteDefinition, RouteSectionProps } from "@solidjs/router";

import { AuthenticatedAppFrame } from "~/components/layout/app-shell/authenticated-app-frame";
import { RecordIndexAppShell } from "~/components/layout/app-shell/record-index-app-shell";
import { meQuery } from "~/features/auth/data/queries/me.query";

export const route = {
  preload: () => meQuery(),
} satisfies RouteDefinition;

export default function RecordIndexLayout(props: RouteSectionProps) {
  return (
    <AuthenticatedAppFrame>
      <RecordIndexAppShell {...props} />
    </AuthenticatedAppFrame>
  );
}
