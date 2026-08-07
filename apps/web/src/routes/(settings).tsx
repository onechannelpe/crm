import type { RouteDefinition, RouteSectionProps } from "@solidjs/router";

import { AuthenticatedAppFrame } from "~/components/layout/app-shell/authenticated-app-frame";
import { SettingsAppShell } from "~/components/layout/app-shell/settings-app-shell";
import { meQuery } from "~/rpc/auth/me";

export const route = {
  preload: () => meQuery(),
} satisfies RouteDefinition;

export default function SettingsLayout(props: RouteSectionProps) {
  return (
    <AuthenticatedAppFrame>
      <SettingsAppShell {...props} />
    </AuthenticatedAppFrame>
  );
}
