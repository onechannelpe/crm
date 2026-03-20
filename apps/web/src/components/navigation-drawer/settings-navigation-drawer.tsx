import { A, useLocation, useNavigate } from "@solidjs/router";
import { For, Show, createMemo, createSignal, onMount } from "solid-js";

import X from "~/components/icons/x";
import {
  getSettingsSectionLabel,
  SETTINGS_NAV_ITEMS,
} from "~/components/layout/settings-nav";
import { useSession } from "~/components/providers/session-provider";
import {
  canAccessPath,
  getDefaultAppPath,
} from "~/lib/auth/access/route-policy";
import { cn } from "~/lib/utils";

import { DrawerSection } from "./navigation-drawer-item";
import { NavigationDrawerShell } from "./navigation-drawer-shell";
import { useNavigationDrawerState } from "./navigation-drawer-state";

import styles from "./navigation-drawer.module.css";

const ADVANCED_SETTINGS_STORAGE_KEY = "crm-settings-advanced-enabled";

export function SettingsNavigationDrawer() {
  const { currentUser } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { expanded, isMobile, setExpanded } = useNavigationDrawerState();

  const [showAdvanced, setShowAdvanced] = createSignal(true);

  onMount(() => {
    if (typeof window === "undefined") return;

    setShowAdvanced(
      window.localStorage.getItem(ADVANCED_SETTINGS_STORAGE_KEY) !== "false",
    );
  });

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

  const toggleAdvanced = () => {
    const next = !showAdvanced();
    setShowAdvanced(next);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADVANCED_SETTINGS_STORAGE_KEY, String(next));
    }
  };

  const closeOnNavigate = () => {
    if (isMobile()) {
      setExpanded(false);
    }
  };

  return (
    <NavigationDrawerShell
      isSettings={true}
      onSearch={() => {
        navigate("/search");
        closeOnNavigate();
      }}
    >
      <div class={styles.scrollable}>
        <section class={styles.section}>
          <A
            href={getDefaultAppPath(currentUser().role)}
            class={styles.item}
            onClick={closeOnNavigate}
          >
            <X size={16} />
            <span
              class={cn(
                styles.itemLabel,
                !expanded() && !isMobile() && styles.itemLabelCollapsed,
              )}
            >
              Salir
            </span>
          </A>
        </section>

        <For each={["user", "workspace"] as const}>
          {(sectionId) => {
            const sectionItems = createMemo(() => groupedItems()[sectionId]);

            return (
              <Show when={sectionItems().length > 0}>
                <DrawerSection
                  label={getSettingsSectionLabel(sectionId)}
                  expanded={expanded() || isMobile()}
                  open={true}
                  onToggle={() => undefined}
                >
                  <For each={sectionItems()}>
                    {(item) => {
                      const Icon = item.icon;
                      const isAdvancedHidden =
                        Boolean(item.advanced) && !showAdvanced();
                      const active =
                        location.pathname === item.href ||
                        location.pathname.startsWith(`${item.href}/`);

                      return (
                        <Show when={!isAdvancedHidden}>
                          <A
                            href={item.href}
                            onClick={closeOnNavigate}
                            class={cn(styles.item, active && styles.itemActive)}
                          >
                            <Icon size={16} />
                            <span
                              class={cn(
                                styles.itemLabel,
                                !expanded() &&
                                  !isMobile() &&
                                  styles.itemLabelCollapsed,
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

        <div class={styles.settingsFooter}>
          <div class={styles.settingsSwitchRow}>
            <span>Avanzado:</span>
            <button
              type="button"
              role="switch"
              aria-checked={showAdvanced()}
              class={cn(
                styles.settingsSwitch,
                showAdvanced() && styles.settingsSwitchChecked,
              )}
              onClick={toggleAdvanced}
            >
              <span class={styles.settingsSwitchThumb} />
            </button>
          </div>
        </div>
      </div>
    </NavigationDrawerShell>
  );
}
