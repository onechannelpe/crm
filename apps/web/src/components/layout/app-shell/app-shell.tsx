import { useLocation, type RouteSectionProps } from "@solidjs/router";
import { Match, Switch } from "solid-js";

import {
  isMerchantGpvPath,
  isRecordShowPath,
  isSettingsRoutePath,
} from "~/domain/navigation/route-classification";

import { MerchantGpvShell } from "./merchant-gpv-shell";
import { RecordShowShell } from "./record-show-shell";
import { SettingsAppShell } from "./settings-app-shell";
import { StandardAppShell } from "./standard-app-shell";

export function AppShell(props: RouteSectionProps) {
  const location = useLocation();
  const isSettingsRoute = () => isSettingsRoutePath(location.pathname);
  const isRecordShow = () => isRecordShowPath(location.pathname);
  const isMerchantGpv = () => isMerchantGpvPath(location.pathname);

  return (
    <Switch fallback={<StandardAppShell {...props} />}>
      <Match when={isSettingsRoute()}>
        <SettingsAppShell {...props} />
      </Match>
      <Match when={isRecordShow()}>
        <RecordShowShell {...props} />
      </Match>
      <Match when={isMerchantGpv()}>
        <MerchantGpvShell {...props} />
      </Match>
    </Switch>
  );
}
