import { useLocation } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";

import { logout } from "~/actions/auth";
import { useSession } from "~/components/providers/session-provider";

import { AdvancedSettingsWrapper } from "../advanced/advanced-settings-wrapper";
import { getNavigationSubItemLeftAdornment } from "../item/get-navigation-sub-item-left-adornment";
import { NavigationDrawerItemGroup } from "../item/navigation-drawer-item-group";
import { NavigationDrawerSection } from "../section/navigation-drawer-section";
import { NavigationDrawerSectionTitle } from "../section/navigation-drawer-section-title";
import { useNavigationDrawerState } from "../state/navigation-drawer-state";
import { createSettingsNavigationSections } from "./settings-navigation-config";
import { SettingsNavigationDrawerItem } from "./settings-navigation-drawer-item";
import { settingsItemMatchesPath } from "./settings-navigation-path-match";

export function SettingsNavigationDrawerItems() {
  const location = useLocation();
  const { currentUser } = useSession();
  const { isMobile, setExpanded } = useNavigationDrawerState();

  const closeOnNavigate = () => {
    if (isMobile()) {
      setExpanded(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    closeOnNavigate();
    window.location.href = "/login";
  };

  const settingsNavigationSections = createMemo(() =>
    createSettingsNavigationSections({
      role: currentUser().role,
      onLogout: handleLogout,
    }),
  );

  return (
    <For each={settingsNavigationSections()}>
      {(section) => {
        const allItemsHidden = createMemo(() =>
          section.items.every((item) => item.isHidden),
        );

        return (
          <Show when={!allItemsHidden()}>
            <NavigationDrawerSection>
              <Show
                when={section.isAdvanced}
                fallback={
                  <NavigationDrawerSectionTitle label={section.label} />
                }
              >
                <AdvancedSettingsWrapper hideDot>
                  <NavigationDrawerSectionTitle label={section.label} />
                </AdvancedSettingsWrapper>
              </Show>

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
                        />
                      }
                    >
                      <NavigationDrawerItemGroup>
                        <SettingsNavigationDrawerItem
                          item={item}
                          hasActiveSubItem={hasActiveSubItem}
                          closeOnNavigate={closeOnNavigate}
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
          </Show>
        );
      }}
    </For>
  );
}
