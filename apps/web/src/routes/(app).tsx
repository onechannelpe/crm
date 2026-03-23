import { useLocation, type RouteSectionProps } from "@solidjs/router";
import { Show, Suspense } from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { Header } from "~/components/layout/header";
import {
  MainDetailPanelProvider,
  useMainDetailPanel,
} from "~/components/providers/main-detail-panel-provider";
import {
  SessionProvider,
  useSession,
} from "~/components/providers/session-provider";
import {
  AppNavigationDrawer,
  NavigationDrawerStateProvider,
} from "~/features/navigation-drawer";
import { isSettingsRoutePath } from "~/lib/navigation/route-classification";
import { cn } from "~/lib/utils";

import shellStyles from "~/components/layout/shell.module.css";

function MainPanelWithDetail(props: RouteSectionProps) {
  const { panel } = useMainDetailPanel();

  return (
    <div
      class={cn(shellStyles.panel, panel() && shellStyles.panelWithDetail)}
      data-has-detail-panel={panel() ? "true" : "false"}
    >
      <div class={shellStyles.panelMain}>
        <Suspense fallback={<Loading />}>{props.children}</Suspense>
      </div>
      <div
        aria-hidden="true"
        class={cn(
          shellStyles.detailGap,
          !panel() && shellStyles.detailGapClosed,
        )}
      />
      <Show when={panel()}>
        {(detail) => <aside class={shellStyles.detailPanel}>{detail()}</aside>}
      </Show>
    </div>
  );
}

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
                <MainDetailPanelProvider>
                  <div class={shellStyles.main}>
                    <Header />
                    <main class={shellStyles.body}>
                      <MainPanelWithDetail {...props} />
                    </main>
                  </div>
                </MainDetailPanelProvider>
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
