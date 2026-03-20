import { useLocation, useNavigate } from "@solidjs/router";
import { For, createMemo } from "solid-js";

import CircleQuestionMark from "~/components/icons/circle-question-mark";
import Settings from "~/components/icons/settings";
import { useSession } from "~/components/providers/session-provider";
import { cn } from "~/lib/utils";

import {
  getMainPrimaryEntries,
  getMainSecondaryGroups,
} from "./navigation-drawer-adapter";
import { DrawerSection, NavigationDrawerItem } from "./navigation-drawer-item";
import { NavigationDrawerShell } from "./navigation-drawer-shell";
import { useNavigationDrawerState } from "./navigation-drawer-state";

import styles from "./navigation-drawer.module.css";

export function MainNavigationDrawer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const {
    expanded,
    isMobile,
    setExpanded,
    setCurrentMobileDrawer,
    isSectionOpen,
    toggleSectionOpen,
    memorizedExpanded,
    setMemorizedExpanded,
    setMemorizedPath,
  } = useNavigationDrawerState();

  const primaryEntries = createMemo(() =>
    getMainPrimaryEntries(currentUser().role),
  );
  const secondaryGroups = createMemo(() =>
    getMainSecondaryGroups(currentUser().role),
  );

  const expandedOrMobile = createMemo(() => expanded() || isMobile());

  const closeOnNavigate = () => {
    if (isMobile()) {
      setExpanded(false);
    }
  };

  const toggleChildGroup = (entryId: string, childHrefs: string[]) => {
    const sectionId = `child:${entryId}`;
    const nextOpen = !isSectionOpen(sectionId);

    toggleSectionOpen(sectionId);

    if (nextOpen) {
      const firstChildHref = childHrefs[0];
      if (firstChildHref) {
        navigate(firstChildHref);
      }
    }
  };

  const handleSettingsClick = () => {
    setMemorizedExpanded(expanded());
    setMemorizedPath(location.pathname + location.search);
    setExpanded(true);
    setCurrentMobileDrawer("settings");
    navigate("/settings/profile");
  };

  return (
    <NavigationDrawerShell
      isSettings={false}
      onSearch={() => {
        navigate("/search");
        closeOnNavigate();
      }}
    >
      <section class={styles.section}>
        <For each={primaryEntries()}>
          {(item) => (
            <NavigationDrawerItem
              item={item}
              expanded={expandedOrMobile()}
              sectionOpen={true}
              closeOnNavigate={closeOnNavigate}
            />
          )}
        </For>
      </section>

      <section class={styles.section}>
        <div class={styles.divider} />
        <For each={secondaryGroups()}>
          {(group) => (
            <DrawerSection
              label={group.label}
              expanded={expandedOrMobile()}
              open={isMobile() || isSectionOpen(`section:${group.id}`)}
              onToggle={() => toggleSectionOpen(`section:${group.id}`)}
            >
              <For each={group.items}>
                {(item) => (
                  <NavigationDrawerItem
                    item={item}
                    expanded={expandedOrMobile()}
                    sectionOpen={isMobile() || isSectionOpen(`section:${group.id}`)}
                    childGroupOpen={isSectionOpen(`child:${item.id}`)}
                    onToggleChildGroup={
                      item.children.length > 0
                        ? () =>
                            toggleChildGroup(
                              item.id,
                              item.children.map((child) => child.href),
                            )
                        : undefined
                    }
                    closeOnNavigate={closeOnNavigate}
                  />
                )}
              </For>
            </DrawerSection>
          )}
        </For>
      </section>

      <section class={styles.section}>
        <DrawerSection
          label="Otros"
          expanded={expandedOrMobile()}
          open={isMobile() || isSectionOpen("section:other")}
          onToggle={() => toggleSectionOpen("section:other")}
        >
          <button type="button" class={cn(styles.item, styles.itemButton)} onClick={handleSettingsClick}>
            <Settings size={16} />
            <span
              class={cn(
                styles.itemLabel,
                !expandedOrMobile() && styles.itemLabelCollapsed,
              )}
            >
              Ajustes
            </span>
          </button>
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            class={styles.item}
            onClick={closeOnNavigate}
          >
            <CircleQuestionMark size={16} />
            <span
              class={cn(
                styles.itemLabel,
                !expandedOrMobile() && styles.itemLabelCollapsed,
              )}
            >
              Documentacion
            </span>
          </a>
        </DrawerSection>
      </section>
    </NavigationDrawerShell>
  );
}
