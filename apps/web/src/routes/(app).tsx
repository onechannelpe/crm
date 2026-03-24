import { useLocation, type RouteSectionProps } from "@solidjs/router";
import { Show } from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { Header } from "~/components/layout/header";
import {
  SessionProvider,
  useSession,
} from "~/components/providers/session-provider";
import {
  AppNavigationDrawer,
  NavigationDrawerStateProvider,
} from "~/features/navigation-drawer";
import { MainContainerWithSidePanel } from "~/features/side-panel/shell/main-container-with-side-panel";
import { SidePanelProvider } from "~/features/side-panel/state/use-side-panel";
import { isSettingsRoutePath } from "~/lib/navigation/route-classification";
import { cn } from "~/lib/utils";

import shellStyles from "~/components/layout/shell.module.css";

function AuthenticatedAppShell(props: RouteSectionProps) {
  const { user } = useSession();
  const location = useLocation();
  const isSettingsRoute = () => isSettingsRoutePath(location.pathname);

  return (
    <Show when={user()} fallback={<Loading />}>
      <NavigationDrawerStateProvider>
        <div class={shellStyles.layoutRoot}>
          <div
            class={cn(
              shellStyles.root,
              isSettingsRoute() && shellStyles.settingsShift,
            )}
          >
            <AppNavigationDrawer />
            <Show
              when={isSettingsRoute()}
              fallback={
                <SidePanelProvider>
                  <div class={shellStyles.main}>
                    <Header />
                    <main class={shellStyles.body}>
                      <MainContainerWithSidePanel>
                        {props.children}
                      </MainContainerWithSidePanel>
                    </main>
                  </div>
                </SidePanelProvider>
              }
            >
              <div class={shellStyles.main}>
                <main class={shellStyles.settingsBody}>{props.children}</main>
              </div>
            </Show>
          </div>
        </div>
      </NavigationDrawerStateProvider>
    </Show>
  );
}

export default function AppLayout(props: RouteSectionProps) {
  return (
    <SessionProvider>
      <AuthenticatedAppShell {...props} />
    </SessionProvider>
  );
}
