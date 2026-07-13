import type { ParentProps } from "solid-js";

import { AuthenticatedSessionProvider } from "~/components/providers/authenticated-session-provider";
import { NavigationDrawerStateProvider } from "~/features/navigation-drawer/state/navigation-drawer-provider";

import { AppShellFrame } from "./app-shell-frame";

export function AuthenticatedAppFrame(props: ParentProps) {
  return (
    <AuthenticatedSessionProvider>
      <NavigationDrawerStateProvider>
        <AppShellFrame>{props.children}</AppShellFrame>
      </NavigationDrawerStateProvider>
    </AuthenticatedSessionProvider>
  );
}
