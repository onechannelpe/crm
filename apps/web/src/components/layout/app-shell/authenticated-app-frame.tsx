import type { ParentProps } from "solid-js";

import { AuthenticatedSessionProvider } from "~/components/providers/authenticated-session-provider";
import { NavigationDrawerStateProvider } from "~/features/navigation-drawer/state/navigation-drawer-provider";
import { SidePanelProvider } from "~/features/side-panel/state/use-side-panel";

import { AppShellFrame } from "./app-shell-frame";

export function AuthenticatedAppFrame(props: ParentProps) {
  return (
    <AuthenticatedSessionProvider>
      <NavigationDrawerStateProvider>
        <SidePanelProvider>
          <AppShellFrame>{props.children}</AppShellFrame>
        </SidePanelProvider>
      </NavigationDrawerStateProvider>
    </AuthenticatedSessionProvider>
  );
}
