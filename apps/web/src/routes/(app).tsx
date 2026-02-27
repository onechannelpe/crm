import { useLocation, type RouteSectionProps } from "@solidjs/router";
import { Show, Suspense } from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { Header } from "~/components/layout/header";
import { SettingsShell } from "~/components/layout/settings-shell";
import { SettingsTopbar } from "~/components/layout/settings-topbar";
import { Sidebar } from "~/components/layout/sidebar";
import {
  SessionProvider,
  useSession,
} from "~/components/providers/session-provider";
import { cn } from "~/lib/utils";

import shellStyles from "~/components/layout/shell.module.css";

function AuthenticatedAppShell(props: RouteSectionProps) {
  const { user } = useSession();
  const location = useLocation();
  const isSettingsRoute = () =>
    location.pathname === "/settings" ||
    location.pathname.startsWith("/settings/");

  return (
    <Show when={user()} fallback={<Loading />}>
      <div class={shellStyles.root}>
        <Show
          when={isSettingsRoute()}
          fallback={
            <>
              <Sidebar />
              <div class={shellStyles.main}>
                <Header />
                <main class={shellStyles.body}>
                  <div class={shellStyles.panel}>
                    <Suspense fallback={<Loading />}>{props.children}</Suspense>
                  </div>
                </main>
              </div>
            </>
          }
        >
          <div class={shellStyles.settingsLayout}>
            <SettingsShell />
            <div class={cn(shellStyles.main, shellStyles.settingsMain)}>
              <SettingsTopbar />
              <main class={cn(shellStyles.body, shellStyles.settingsBody)}>
                <div class={cn(shellStyles.panel, shellStyles.settingsPanel)}>
                  <Suspense fallback={<Loading />}>{props.children}</Suspense>
                </div>
              </main>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
}

export default function AppLayout(props: RouteSectionProps) {
  return (
    <SessionProvider>
      <Suspense fallback={<Loading />}>
        <AuthenticatedAppShell {...props} />
      </Suspense>
    </SessionProvider>
  );
}
