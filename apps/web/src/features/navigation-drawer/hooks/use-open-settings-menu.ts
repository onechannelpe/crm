import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

export function useOpenSettingsMenu() {
  const { setExpanded, setCurrentMobileDrawer } = useNavigationDrawerState();

  const openSettingsMenu = () => {
    setExpanded(true);
    setCurrentMobileDrawer("settings");
  };

  return { openSettingsMenu };
}
