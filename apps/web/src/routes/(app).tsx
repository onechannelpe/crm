import { useLocation, type RouteSectionProps } from "@solidjs/router";
import {
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
  Suspense,
} from "solid-js";

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

const SETTINGS_DRAWER_WIDTH = 220;
const SETTINGS_CONTENT_WIDTH = 512;
const SETTINGS_LAYOUT_GUTTER = 76;

function AuthenticatedAppShell(props: RouteSectionProps) {
  const { user } = useSession();
  const location = useLocation();
  const [viewportWidth, setViewportWidth] = createSignal(0);
  const isSettingsRoute = () => location.pathname.startsWith("/settings/");

  onMount(() => {
    if (typeof window === "undefined") return;
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    onCleanup(() => window.removeEventListener("resize", updateViewportWidth));
  });

  const settingsContainerStyle = createMemo(() => {
    if (!isSettingsRoute()) return null;
    if (viewportWidth() < 768) return { "margin-left": "0px" };

    const centeredExtra = Math.max(
      0,
      (viewportWidth() -
        (SETTINGS_CONTENT_WIDTH +
          SETTINGS_DRAWER_WIDTH +
          SETTINGS_LAYOUT_GUTTER)) /
        2,
    );

    return { "margin-left": `${centeredExtra}px` };
  });

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
          <div
            class={shellStyles.settingsLayout}
            style={settingsContainerStyle() ?? undefined}
          >
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
