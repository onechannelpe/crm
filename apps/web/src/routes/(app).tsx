import type { RouteSectionProps } from "@solidjs/router";
import { Show, Suspense } from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { ToastContainer } from "~/components/feedback/toast";
import { ToastProvider } from "~/components/feedback/toast-provider";
import { Header } from "~/components/layout/header";
import { Sidebar } from "~/components/layout/sidebar";
import {
  SessionProvider,
  useSession,
} from "~/components/providers/session-provider";

function AuthenticatedAppShell(props: RouteSectionProps) {
  const { user } = useSession();

  return (
    <Show when={user()} fallback={<Loading />}>
      <div class="crm-shell min-h-screen flex font-sans text-foreground">
        <Sidebar />
        <div class="tw-app-shell-main">
          <Header />
          <main class="tw-app-shell-body">
            <div class="tw-app-shell-content crm-fade-up">
              <div class="tw-app-shell-panel">
                <Suspense fallback={<Loading />}>{props.children}</Suspense>
              </div>
            </div>
          </main>
        </div>
      </div>
    </Show>
  );
}

export default function AppLayout(props: RouteSectionProps) {
  return (
    <ToastProvider>
      <SessionProvider>
        <Suspense fallback={<Loading />}>
          <AuthenticatedAppShell {...props} />
        </Suspense>
      </SessionProvider>
      <ToastContainer />
    </ToastProvider>
  );
}
