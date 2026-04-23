import { useLocation, type RouteSectionProps } from "@solidjs/router";
import { Match, Switch } from "solid-js";

import {
  isRecordShowPath,
  isSettingsRoutePath,
} from "~/lib/navigation/route-classification";

import { AppShellFrame } from "./app-shell-frame";
import { RecordShowShell } from "./record-show-shell";
import { SettingsAppShell } from "./settings-app-shell";
import { StandardAppShell } from "./standard-app-shell";

export function AppShell(props: RouteSectionProps) {
  const location = useLocation();
  const isSettingsRoute = () => isSettingsRoutePath(location.pathname);
  const isRecordShow = () => isRecordShowPath(location.pathname);

  return (
    <AppShellFrame>
      <Switch fallback={<StandardAppShell {...props} />}>
        <Match when={isSettingsRoute()}>
          <SettingsAppShell {...props} />
        </Match>
        <Match when={isRecordShow()}>
          <RecordShowShell {...props} />
        </Match>
      </Switch>
    </AppShellFrame>
  );
}
