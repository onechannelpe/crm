import { AppNavigationDrawer } from "./app-navigation-drawer";
import { NavigationDrawerBrowserEffects } from "./navigation-drawer-browser-effects";

export function NavigationDrawerHost() {
  return (
    <>
      <NavigationDrawerBrowserEffects />
      <AppNavigationDrawer />
    </>
  );
}
