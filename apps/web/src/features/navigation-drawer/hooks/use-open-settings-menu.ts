import { useNavigationDrawerState } from "../state/navigation-drawer-state";

export function useOpenSettingsMenu() {
  const { setExpanded, setCurrentMobileDrawer } = useNavigationDrawerState();

  const openSettingsMenu = () => {
    setExpanded(true);
    setCurrentMobileDrawer("settings");
  };

  return { openSettingsMenu };
}
