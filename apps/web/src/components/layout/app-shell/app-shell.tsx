import { useLocation, type RouteSectionProps } from "@solidjs/router";
import { Show } from "solid-js";

import { isSettingsRoutePath } from "~/lib/navigation/route-classification";

import { AppShellFrame } from "./app-shell-frame";
import { SettingsAppShell } from "./settings-app-shell";
import { StandardAppShell } from "./standard-app-shell";

export function AppShell(props: RouteSectionProps) {
  const location = useLocation();
  const isSettingsRoute = () => isSettingsRoutePath(location.pathname);

  return (
    <AppShellFrame>
      <Show when={isSettingsRoute()} fallback={<StandardAppShell {...props} />}>
        <SettingsAppShell {...props} />
      </Show>
    </AppShellFrame>
  );
}
