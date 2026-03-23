import { AdvancedSettingsToggle } from "../advanced/advanced-settings-toggle";
import { SettingsNavigationDrawerItems } from "./settings-navigation-drawer-items";
import { NavigationDrawerFixedContent } from "../shell/navigation-drawer-fixed-content";
import { NavigationDrawerScrollableContent } from "../shell/navigation-drawer-scrollable-content";
import { NavigationDrawer } from "../shell/navigation-drawer-shell";
import { useNavigationDrawerState } from "../state/navigation-drawer-state";

export function SettingsNavigationDrawer() {
  const { advancedModeEnabled, setAdvancedModeEnabled } =
    useNavigationDrawerState();

  return (
    <NavigationDrawer title="Salir de ajustes">
      <NavigationDrawerScrollableContent>
        <SettingsNavigationDrawerItems />
      </NavigationDrawerScrollableContent>

      <NavigationDrawerFixedContent>
        <AdvancedSettingsToggle
          isAdvancedModeEnabled={advancedModeEnabled()}
          setIsAdvancedModeEnabled={setAdvancedModeEnabled}
          label="Avanzado:"
        />
      </NavigationDrawerFixedContent>
    </NavigationDrawer>
  );
}
