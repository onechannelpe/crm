import type { RouteDefinition, RouteSectionProps } from "@solidjs/router";

import { AuthenticatedAppFrame } from "~/components/layout/app-shell/authenticated-app-frame";
import { RecordShowShell } from "~/components/layout/app-shell/record-show-shell";
import { meQuery } from "~/rpc/auth/me";

export const route = {
  preload: () => meQuery(),
} satisfies RouteDefinition;

export default function RecordShowLayout(props: RouteSectionProps) {
  return (
    <AuthenticatedAppFrame>
      <RecordShowShell {...props} />
    </AuthenticatedAppFrame>
  );
}
