import type { ParentProps } from "solid-js";

import { MobileNavigationBar } from "~/features/navigation-drawer/mobile/mobile-navigation-bar";
import { NavigationDrawerHost } from "~/features/navigation-drawer/shell/navigation-drawer-host";

import shellStyles from "../shell.module.css";

export function AppShellFrame(props: ParentProps) {
  return (
    <div class={shellStyles.layoutRoot}>
      <div class={shellStyles.root}>
        <NavigationDrawerHost />
        {props.children}
      </div>
      <MobileNavigationBar />
    </div>
  );
}
