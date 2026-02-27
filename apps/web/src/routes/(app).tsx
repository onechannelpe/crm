import { useLocation, type RouteSectionProps } from "@solidjs/router";
import { Show, Suspense } from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { Header } from "~/components/layout/header";
import { SettingsShell } from "~/components/layout/settings-shell";
import { Sidebar } from "~/components/layout/sidebar";
import {
  SessionProvider,
  useSession,
} from "~/components/providers/session-provider";

import shellStyles from "~/components/layout/shell.module.css";

function AuthenticatedAppShell(props: RouteSectionProps) {
  const { user } = useSession();
  const location = useLocation();
  const isSettingsRoute = () =>
    location.pathname === "/settings" ||
    location.pathname.startsWith("/settings/");

  return (
    <Show when={user()} fallback={<Loading />}>
      <Show
        when={isSettingsRoute()}
        fallback={
          <div class={shellStyles.root}>
            <Sidebar />
            <div class={shellStyles.main}>
              <Header />
              <main class={shellStyles.body}>
                <div class={shellStyles.panel}>
                  <Suspense fallback={<Loading />}>{props.children}</Suspense>
                </div>
              </main>
            </div>
          </div>
        }
      >
        <SettingsShell>
          <Suspense fallback={<Loading />}>{props.children}</Suspense>
        </SettingsShell>
      </Show>
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
