import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

export function useOpenSettingsMenu() {
  const { setExpanded, setCurrentMobileDrawer } = useNavigationDrawerState();

  return () => {
    setExpanded(true);
    setCurrentMobileDrawer("settings");
  };
}
