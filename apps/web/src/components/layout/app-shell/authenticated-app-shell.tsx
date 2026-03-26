import type { RouteSectionProps } from "@solidjs/router";
import { useLocation } from "@solidjs/router";
import { Show } from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { useSession } from "~/components/providers/session-provider";
import { NavigationDrawerStateProvider } from "~/features/navigation-drawer/state/navigation-drawer-provider";
import { isSettingsRoutePath } from "~/lib/navigation/route-classification";
import { traceSsrBoundary } from "~/lib/observability/diagnostics";

import { AppShell } from "./app-shell";

export function AuthenticatedAppShell(props: RouteSectionProps) {
  const { user } = useSession();
  const location = useLocation();
  const currentUser = user();
  const isSettingsRoute = () => isSettingsRoutePath(location.pathname);

  traceSsrBoundary("app-layout", "authenticated_shell_render", {
    path: location.pathname,
    hasUser: currentUser !== undefined && currentUser !== null,
    loadingUser: currentUser === undefined,
    isSettingsRoute: isSettingsRoute(),
  });

  return (
    <Show when={currentUser} fallback={<Loading />}>
      <NavigationDrawerStateProvider>
        <AppShell {...props} />
      </NavigationDrawerStateProvider>
    </Show>
  );
}
