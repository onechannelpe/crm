import { useLocation, useNavigate } from "@solidjs/router";
import { createMemo, Show } from "solid-js";

import List from "~/components/icons/list";
import Search from "~/components/icons/search";
import Settings from "~/components/icons/settings";
import { ICON_BY_ROUTE } from "~/components/layout/route-icons";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import {
  NavigationBar,
  type NavigationBarItemDef,
} from "~/components/ui/navigation/navigation-bar/navigation-bar";
import { getDefaultAppPath } from "~/domain/auth/access/route-policy";

import { useIsSettingsPage } from "../hooks/use-is-settings-page";
import { useOpenSettingsMenu } from "../hooks/use-open-settings-menu";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

export function MobileNavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuthenticatedSession();
  const {
    expanded,
    setExpanded,
    currentMobileDrawer,
    setCurrentMobileDrawer,
    isMobile,
    memorizeNavigationState,
  } = useNavigationDrawerState();
  const isSettingsPage = useIsSettingsPage();
  const openSettingsMenu = useOpenSettingsMenu();

  const activeItemName = createMemo(() => {
    if (isSettingsPage()) return "settings";
    if (expanded()) return currentMobileDrawer();
    if (location.pathname.startsWith("/records")) return "records";
    return "main";
  });

  const items = createMemo<NavigationBarItemDef[]>(() => [
    {
      name: "main",
      label: "Abrir navegación",
      Icon: List,
      onClick: () => {
        setCurrentMobileDrawer("main");
        setExpanded((previous) => activeItemName() !== "main" || !previous);

        if (isSettingsPage()) {
          navigate(getDefaultAppPath(currentUser().role));
        }
      },
    },
    {
      name: "records",
      label: "Registros",
      Icon: ICON_BY_ROUTE.leads,
      onClick: () => {
        setExpanded(false);
        navigate("/records");
      },
    },
    {
      name: "search",
      label: "Buscar",
      Icon: Search,
      onClick: () => {
        setExpanded(false);
        navigate("/search");
      },
    },
    {
      name: "settings",
      label: "Abrir ajustes",
      Icon: Settings,
      onClick: () => {
        memorizeNavigationState(
          location.pathname + location.search,
          expanded(),
        );
        openSettingsMenu();

        if (!isSettingsPage()) {
          navigate("/settings/profile");
        }
      },
    },
  ]);

  return (
    <Show when={isMobile()}>
      <NavigationBar activeItemName={activeItemName()} items={items()} />
    </Show>
  );
}
