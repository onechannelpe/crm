import type { RouteDefinition, RouteSectionProps } from "@solidjs/router";

import { AppShell } from "~/components/layout/app-shell/app-shell";
import { AuthenticatedAppFrame } from "~/components/layout/app-shell/authenticated-app-frame";
import { meQuery } from "~/features/auth/data/queries/me.query";

export const route = {
  preload: () => meQuery(),
} satisfies RouteDefinition;

export default function AppLayout(props: RouteSectionProps) {
  return (
    <AuthenticatedAppFrame>
      <AppShell {...props} />
    </AuthenticatedAppFrame>
  );
}
