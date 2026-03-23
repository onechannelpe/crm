import { useLocation } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";

import { logout } from "~/actions/auth";
import { useSession } from "~/components/providers/session-provider";
import { canAccessPath } from "~/lib/auth/access/route-policy";

import { getNavigationSubItemLeftAdornment } from "../item/get-navigation-sub-item-left-adornment";
import { NavigationDrawerItemGroup } from "../item/navigation-drawer-item-group";
import { NavigationDrawerSection } from "../section/navigation-drawer-section";
import { NavigationDrawerSectionTitle } from "../section/navigation-drawer-section-title";
import { useNavigationDrawerState } from "../state/navigation-drawer-state";
import { SETTINGS_NAV_SECTIONS } from "./settings-navigation-config";
import { SettingsNavigationDrawerItem } from "./settings-navigation-drawer-item";
import { settingsItemMatchesPath } from "./settings-navigation-path-match";
import type { SettingsNavItem } from "./settings-navigation.types";

export function SettingsNavigationDrawerItems() {
  const location = useLocation();
  const { currentUser } = useSession();
  const { isMobile, setExpanded } = useNavigationDrawerState();

  const visibleSections = createMemo(() => {
    const role = currentUser().role;

    return SETTINGS_NAV_SECTIONS.map((section) => {
      const items = section.items.filter((item) => {
        if (!item.href) {
          return true;
        }

        return canAccessPath(role, item.href);
      });

      return {
        ...section,
        items,
      };
    }).filter((section) => section.items.length > 0);
  });

  const closeOnNavigate = () => {
    if (isMobile()) {
      setExpanded(false);
    }
  };

  const handleAction = async (item: SettingsNavItem) => {
    if (item.action === "logout") {
      await logout();
      closeOnNavigate();
      window.location.href = "/login";
    }
  };

  return (
    <For each={visibleSections()}>
      {(section) => (
        <NavigationDrawerSection>
          <NavigationDrawerSectionTitle label={section.label} />

          <For each={section.items}>
            {(item, index) => {
              const subItems = item.subItems ?? [];
              const selectedSubItemIndex = subItems.findIndex((subItem) =>
                settingsItemMatchesPath(
                  location.pathname,
                  subItem.href,
                  subItem.matchSubPages,
                ),
              );
              const hasActiveSubItem = selectedSubItemIndex >= 0;

              return (
                <Show
                  when={subItems.length > 0}
                  fallback={
                    <SettingsNavigationDrawerItem
                      item={item}
                      closeOnNavigate={closeOnNavigate}
                      onAction={handleAction}
                    />
                  }
                >
                  <NavigationDrawerItemGroup>
                    <SettingsNavigationDrawerItem
                      item={item}
                      hasActiveSubItem={hasActiveSubItem}
                      closeOnNavigate={closeOnNavigate}
                      onAction={handleAction}
                      subItemState={
                        item.indentationLevel === 2
                          ? getNavigationSubItemLeftAdornment({
                              arrayLength: section.items.length,
                              index: index(),
                              selectedIndex: selectedSubItemIndex,
                            })
                          : undefined
                      }
                    />

                    <For each={subItems}>
                      {(subItem, subIndex) => (
                        <SettingsNavigationDrawerItem
                          item={subItem}
                          closeOnNavigate={closeOnNavigate}
                          onAction={handleAction}
                          subItemState={
                            subItem.indentationLevel === 2
                              ? getNavigationSubItemLeftAdornment({
                                  arrayLength: subItems.length,
                                  index: subIndex(),
                                  selectedIndex: selectedSubItemIndex,
                                })
                              : undefined
                          }
                        />
                      )}
                    </For>
                  </NavigationDrawerItemGroup>
                </Show>
              );
            }}
          </For>
        </NavigationDrawerSection>
      )}
    </For>
  );
}
