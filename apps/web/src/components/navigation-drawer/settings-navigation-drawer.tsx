import { A, useLocation, useNavigate } from "@solidjs/router";
import { For, Show, createMemo } from "solid-js";

import { logout } from "~/actions/auth";
import CircleQuestionMark from "~/components/icons/circle-question-mark";
import LogOut from "~/components/icons/log-out";
import { useSession } from "~/components/providers/session-provider";
import {
  canAccessPath,
  getDefaultAppPath,
} from "~/lib/auth/access/route-policy";
import { cn } from "~/lib/utils";

import {
  SETTINGS_NAV_ITEMS,
  getSettingsSectionLabel,
} from "./settings-navigation-config";
import { DrawerSection } from "./navigation-drawer-item";
import { NavigationDrawerShell } from "./navigation-drawer-shell";
import { useNavigationDrawerState } from "./navigation-drawer-state";

import styles from "./navigation-drawer.module.css";

export function SettingsNavigationDrawer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useSession();
  const {
    expanded,
    isMobile,
    setExpanded,
    advancedModeEnabled,
    setAdvancedModeEnabled,
  } = useNavigationDrawerState();

  const visibleItems = createMemo(() => {
    const role = currentUser().role;

    return SETTINGS_NAV_ITEMS.filter((item) => canAccessPath(role, item.href));
  });

  const groupedItems = createMemo(() => {
    const items = visibleItems();

    return {
      user: items.filter((item) => item.section === "user"),
      workspace: items.filter((item) => item.section === "workspace"),
    };
  });

  const closeOnNavigate = () => {
    if (isMobile()) {
      setExpanded(false);
    }
  };

  const expandedOrMobile = createMemo(() => expanded() || isMobile());

  return (
    <NavigationDrawerShell
      isSettings={true}
      title="Salir de ajustes"
      onSearch={() => {
        navigate("/search");
        closeOnNavigate();
      }}
      fixedContent={
        <div class={styles.settingsFooter}>
          <div class={styles.settingsSwitchRow}>
            <span>Avanzado:</span>
            <button
              type="button"
              role="switch"
              aria-checked={advancedModeEnabled()}
              class={cn(
                styles.settingsSwitch,
                advancedModeEnabled() && styles.settingsSwitchChecked,
              )}
              onClick={() => setAdvancedModeEnabled((value) => !value)}
            >
              <span class={styles.settingsSwitchThumb} />
            </button>
          </div>
        </div>
      }
    >
      <For each={(["user", "workspace"] as const)}>
        {(sectionId) => {
          const sectionItems = createMemo(() => groupedItems()[sectionId]);

          return (
            <Show when={sectionItems().length > 0}>
              <DrawerSection
                label={getSettingsSectionLabel(sectionId)}
                expanded={expandedOrMobile()}
                open={true}
                onToggle={() => undefined}
                collapsible={false}
              >
                <For each={sectionItems()}>
                  {(item) => {
                    const Icon = item.icon;
                    const active =
                      location.pathname === item.href ||
                      location.pathname.startsWith(`${item.href}/`);
                    const hidden = item.advanced && !advancedModeEnabled();

                    return (
                      <Show when={!hidden}>
                        <A
                          href={item.href}
                          onClick={closeOnNavigate}
                          class={cn(styles.item, active && styles.itemActive)}
                        >
                          <Icon size={16} />
                          <span
                            class={cn(
                              styles.itemLabel,
                              !expandedOrMobile() && styles.itemLabelCollapsed,
                            )}
                          >
                            {item.label}
                          </span>
                        </A>
                      </Show>
                    );
                  }}
                </For>
              </DrawerSection>
            </Show>
          );
        }}
      </For>

      <DrawerSection
        label="Otros"
        expanded={expandedOrMobile()}
        open={true}
        onToggle={() => undefined}
        collapsible={false}
      >
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

        <button
          type="button"
          class={cn(styles.item, styles.itemButton)}
          onClick={() => {
            logout();
            closeOnNavigate();
            navigate(getDefaultAppPath(currentUser().role));
          }}
        >
          <LogOut size={16} />
          <span
            class={cn(
              styles.itemLabel,
              !expandedOrMobile() && styles.itemLabelCollapsed,
            )}
          >
            Cerrar sesion
          </span>
        </button>
      </DrawerSection>
    </NavigationDrawerShell>
  );
}
