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

import shellStyles from "~/components/layout/shell.module.css";

function AuthenticatedAppShell(props: RouteSectionProps) {
  const { user } = useSession();

  return (
    <Show when={user()} fallback={<Loading />}>
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
