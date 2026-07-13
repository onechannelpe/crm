import type { ParentProps } from "solid-js";

import { ImpersonationBanner } from "~/features/impersonation/impersonation-banner";
import { MobileNavigationBar } from "~/features/navigation-drawer/mobile/mobile-navigation-bar";
import { NavigationDrawerHost } from "~/features/navigation-drawer/shell/navigation-drawer-host";

import shellStyles from "../shell.module.css";

export function AppShellFrame(props: ParentProps) {
  return (
    <div class={shellStyles.layoutRoot}>
      <ImpersonationBanner />
      <div class={shellStyles.root}>
        <NavigationDrawerHost />
        {props.children}
      </div>
      <MobileNavigationBar />
    </div>
  );
}
