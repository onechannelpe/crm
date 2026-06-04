import { useLocation } from "@solidjs/router";
import type { ParentProps } from "solid-js";

import { MobileNavigationBar } from "~/features/navigation-drawer/mobile/mobile-navigation-bar";
import { NavigationDrawerHost } from "~/features/navigation-drawer/shell/navigation-drawer-host";
import { isSettingsRoutePath } from "~/lib/navigation/route-classification";
import { cn } from "~/lib/utils";

import shellStyles from "../shell.module.css";

export function AppShellFrame(props: ParentProps) {
  const location = useLocation();
  const isSettingsRoute = () => isSettingsRoutePath(location.pathname);

  return (
    <div class={shellStyles.layoutRoot}>
      <div
        class={cn(
          shellStyles.root,
          isSettingsRoute() && shellStyles.settingsShift,
        )}
      >
        <NavigationDrawerHost />
        {props.children}
      </div>
      <MobileNavigationBar />
    </div>
  );
}
