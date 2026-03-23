import { useLocation, useNavigate } from "@solidjs/router";
import { For } from "solid-js";

import CircleQuestionMark from "~/components/icons/circle-question-mark";
import Settings from "~/components/icons/settings";
import { useSession } from "~/components/providers/session-provider";
import { AnimatedExpandableContainer } from "~/components/ui/animation/animated-expandable-container";
import {
  getEntryIcon,
  getMainPrimaryEntries,
  getMainSecondaryGroups,
  isChildActive,
  isEntryActive,
} from "../adapters/navigation-drawer-adapter";
import { getNavigationSubItemLeftAdornment } from "../item/get-navigation-sub-item-left-adornment";
import { NavigationDrawerItem } from "../item/navigation-drawer-item";
import { NavigationDrawerItemGroup } from "../item/navigation-drawer-item-group";
import { NavigationDrawerItemsCollapsableContainer } from "../item/navigation-drawer-items-collapsable-container";
import { NavigationDrawerSubItem } from "../item/navigation-drawer-sub-item";
import { NavigationDrawerSection } from "../section/navigation-drawer-section";
import { NavigationDrawerSectionTitle } from "../section/navigation-drawer-section-title";
import { NavigationDrawerScrollableContent } from "./navigation-drawer-scrollable-content";
import { NavigationDrawer } from "./navigation-drawer-shell";
import { useNavigationDrawerState } from "../state/navigation-drawer-state";

import styles from "../navigation-drawer.module.css";

export function MainNavigationDrawer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const {
    isMobile,
    isSectionOpen,
    toggleSectionOpen,
    isFolderOpen,
    toggleFolderOpen,
    setExpanded,
    expanded,
    memorizeNavigationState,
    setCurrentMobileDrawer,
  } = useNavigationDrawerState();

  const primaryEntries = () => getMainPrimaryEntries(currentUser().role);
  const secondaryGroups = () => getMainSecondaryGroups(currentUser().role);

  const closeOnNavigate = () => {
    if (isMobile()) {
      setExpanded(false);
    }
  };

  const openSettings = () => {
    memorizeNavigationState(location.pathname + location.search, expanded());
    setExpanded(true);
    setCurrentMobileDrawer("settings");
    navigate("/settings/profile");
  };

  return (
    <NavigationDrawer title="Navegacion">
      <NavigationDrawerScrollableContent>
        <NavigationDrawerSection>
          <NavigationDrawerItemsCollapsableContainer>
            <For each={primaryEntries()}>
              {(entry) => (
                <NavigationDrawerItem
                  label={entry.label}
                  to={entry.href}
                  Icon={getEntryIcon(entry.icon)}
                  active={isEntryActive(location.pathname, entry)}
                  closeOnNavigate={closeOnNavigate}
                />
              )}
            </For>
          </NavigationDrawerItemsCollapsableContainer>
        </NavigationDrawerSection>

        <NavigationDrawerSection>
          <div class={styles.divider} />
          <For each={secondaryGroups()}>
            {(group) => {
              const sectionKey = `section:${group.id}`;
              const sectionOpen = () => isMobile() || isSectionOpen(sectionKey);

              return (
                <NavigationDrawerSection>
                  <NavigationDrawerSectionTitle
                    label={group.label}
                    isOpen={sectionOpen()}
                    onClick={() => toggleSectionOpen(sectionKey)}
                  />

                  <NavigationDrawerItemsCollapsableContainer>
                    <For each={group.items}>
                      {(item) => {
                        const hasChildren = item.children.length > 0;
                        const childSectionKey = `child:${item.id}`;
                        const childOpen = () => isFolderOpen(childSectionKey);
                        const selectedChildIndex = () =>
                          item.children.findIndex((child) =>
                            isChildActive(location.pathname, child.href),
                          );

                        return (
                          <NavigationDrawerItemGroup>
                            <NavigationDrawerItem
                              label={item.label}
                              to={hasChildren ? undefined : item.href}
                              Icon={getEntryIcon(item.icon)}
                              active={
                                hasChildren
                                  ? selectedChildIndex() >= 0 && !childOpen()
                                  : isEntryActive(location.pathname, item)
                              }
                              closeOnNavigate={closeOnNavigate}
                              onClick={
                                hasChildren
                                  ? () => {
                                      const nextOpen = !childOpen();
                                      toggleFolderOpen(childSectionKey);

                                      if (nextOpen && item.children[0]) {
                                        navigate(item.children[0].href);
                                      }
                                    }
                                  : undefined
                              }
                              showChevron={hasChildren}
                              chevronExpanded={childOpen()}
                              alwaysShowRightOptions={hasChildren}
                            />

                            {hasChildren ? (
                              <AnimatedExpandableContainer
                                isExpanded={sectionOpen() && childOpen()}
                                duration={300}
                              >
                                <For each={item.children}>
                                  {(child, subIndex) => (
                                    <NavigationDrawerSubItem
                                      label={child.label}
                                      to={child.href}
                                      active={isChildActive(
                                        location.pathname,
                                        child.href,
                                      )}
                                      subItemState={getNavigationSubItemLeftAdornment(
                                        {
                                          index: subIndex(),
                                          arrayLength: item.children.length,
                                          selectedIndex: selectedChildIndex(),
                                        },
                                      )}
                                      closeOnNavigate={closeOnNavigate}
                                    />
                                  )}
                                </For>
                              </AnimatedExpandableContainer>
                            ) : null}
                          </NavigationDrawerItemGroup>
                        );
                      }}
                    </For>
                  </NavigationDrawerItemsCollapsableContainer>
                </NavigationDrawerSection>
              );
            }}
          </For>
        </NavigationDrawerSection>

        <NavigationDrawerSection>
          <NavigationDrawerSectionTitle label="Otros" />
          <NavigationDrawerItemsCollapsableContainer>
            <NavigationDrawerItem
              label="Ajustes"
              Icon={Settings}
              onClick={openSettings}
            />
            <NavigationDrawerItem
              label="Documentacion"
              to="/docs"
              Icon={CircleQuestionMark}
              closeOnNavigate={closeOnNavigate}
            />
          </NavigationDrawerItemsCollapsableContainer>
        </NavigationDrawerSection>
      </NavigationDrawerScrollableContent>
    </NavigationDrawer>
  );
}
