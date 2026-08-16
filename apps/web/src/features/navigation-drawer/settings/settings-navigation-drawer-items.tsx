import { useAction, useLocation } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";

import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { logoutMutation } from "~/features/auth/data/mutations";

import { AdvancedSettingsWrapper } from "../advanced/advanced-settings-wrapper";
import { getNavigationSubItemLeftAdornment } from "../item/get-navigation-sub-item-left-adornment";
import { NavigationDrawerItemGroup } from "../item/navigation-drawer-item-group";
import { NavigationDrawerSection } from "../section/navigation-drawer-section";
import { NavigationDrawerSectionTitle } from "../section/navigation-drawer-section-title";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";
import { createSettingsNavigationSections } from "./settings-navigation-config";
import { SettingsNavigationDrawerItem } from "./settings-navigation-drawer-item";
import { settingsItemMatchesPath } from "./settings-navigation-path-match";

export function SettingsNavigationDrawerItems() {
  const location = useLocation();
  const { currentUser } = useAuthenticatedSession();
  const { isMobile, setExpanded } = useNavigationDrawerState();
  const logout = useAction(logoutMutation);

  function closeOnNavigate() {
    if (isMobile()) {
      setExpanded(false);
    }
  }

  async function handleLogout() {
    await logout();
    closeOnNavigate();
    window.location.href = "/login";
  }

  const sections = createMemo(() =>
    createSettingsNavigationSections({
      role: currentUser().role,
      onLogout: handleLogout,
    }),
  );

  return (
    <For each={sections()}>
      {(section) => {
        const visibleItems = createMemo(() =>
          section.items.filter((item) => !item.isHidden),
        );

        return (
          <Show when={visibleItems().length > 0}>
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

              <For each={visibleItems()}>
                {(item, index) => {
                  const subItems = item.subItems ?? [];

                  const selectedSubItemIndex = createMemo(() =>
                    subItems.findIndex((subItem) =>
                      settingsItemMatchesPath(
                        location.pathname,
                        subItem.href,
                        subItem.matchSubPages,
                      ),
                    ),
                  );

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
                          hasActiveSubItem={selectedSubItemIndex() >= 0}
                          closeOnNavigate={closeOnNavigate}
                          subItemState={
                            item.indentationLevel === 2
                              ? getNavigationSubItemLeftAdornment({
                                  arrayLength: visibleItems().length,
                                  index: index(),
                                  selectedIndex: selectedSubItemIndex(),
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
                                      selectedIndex: selectedSubItemIndex(),
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
