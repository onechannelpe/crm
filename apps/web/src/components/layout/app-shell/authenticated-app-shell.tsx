import type { RouteSectionProps } from "@solidjs/router";
import { useLocation } from "@solidjs/router";

import { NavigationDrawerStateProvider } from "~/features/navigation-drawer/state/navigation-drawer-provider";
import { isSettingsRoutePath } from "~/lib/navigation/route-classification";
import { traceSsrBoundary } from "~/lib/observability/diagnostics/server";

import { AppShell } from "./app-shell";

export function AuthenticatedAppShell(props: RouteSectionProps) {
  const location = useLocation();
  const isSettingsRoute = () => isSettingsRoutePath(location.pathname);

  traceSsrBoundary("app-layout", "authenticated_shell_render", {
    path: location.pathname,
    isSettingsRoute: isSettingsRoute(),
  });

  return (
    <NavigationDrawerStateProvider>
      <AppShell {...props} />
    </NavigationDrawerStateProvider>
  );
}
