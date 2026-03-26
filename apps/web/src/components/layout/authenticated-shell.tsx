import { useLocation, type RouteSectionProps } from "@solidjs/router";
import { Show } from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { useSession } from "~/components/providers/session-provider";
import { AppNavigationDrawer } from "~/features/navigation-drawer/shell/app-navigation-drawer";
import { NavigationDrawerStateProvider } from "~/features/navigation-drawer/state/navigation-drawer-state";
import { MainContainerWithSidePanel } from "~/features/side-panel/shell/main-container-with-side-panel";
import { SidePanelProvider } from "~/features/side-panel/state/use-side-panel";
import { isSettingsRoutePath } from "~/lib/navigation/route-classification";
import { traceSsrBoundary } from "~/lib/observability/diagnostics";
import { cn } from "~/lib/utils";

import { AppHeader } from "./app-header";

import shellStyles from "./shell.module.css";

function AuthenticatedShellFrame(props: RouteSectionProps) {
  const location = useLocation();
  const isSettingsRoute = () => isSettingsRoutePath(location.pathname);

  return (
    <div class={shellStyles.layoutRoot}>
      <div
        class={cn(
          shellStyles.root,
          isSettingsRoute() && shellStyles.settingsShift,
        )}
      >
        <AppNavigationDrawer />
        {props.children}
      </div>
    </div>
  );
}

function StandardAppShell(props: RouteSectionProps) {
  return (
    <SidePanelProvider>
      <div class={shellStyles.main}>
        <AppHeader />
        <main class={shellStyles.body}>
          <MainContainerWithSidePanel>
            {props.children}
          </MainContainerWithSidePanel>
        </main>
      </div>
    </SidePanelProvider>
  );
}

function SettingsAppShell(props: RouteSectionProps) {
  return (
    <div class={shellStyles.main}>
      <main class={shellStyles.settingsBody}>{props.children}</main>
    </div>
  );
}

export function AuthenticatedShell(props: RouteSectionProps) {
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
        <AuthenticatedShellFrame {...props}>
          <Show
            when={isSettingsRoute()}
            fallback={<StandardAppShell {...props} />}
          >
            <SettingsAppShell {...props} />
          </Show>
        </AuthenticatedShellFrame>
      </NavigationDrawerStateProvider>
    </Show>
  );
}
