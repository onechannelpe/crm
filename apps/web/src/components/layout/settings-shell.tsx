import { A, useLocation } from "@solidjs/router";
import { createMemo, createSignal, For, Show, type JSX } from "solid-js";

import X from "~/components/icons/x";
import { useSession } from "~/components/providers/session-provider";
import {
  canAccessPath,
  getDefaultAppPath,
} from "~/lib/auth/access/route-policy";
import { cn } from "~/lib/utils";

import {
  getCurrentSettingsItem,
  getSettingsSectionLabel,
  SETTINGS_NAV_ITEMS,
} from "./settings-nav";

import styles from "./settings-shell.module.css";

const ADVANCED_SETTINGS_STORAGE_KEY = "crm-settings-advanced-enabled";

interface SettingsShellProps {
  children: JSX.Element;
}

export function SettingsShell(props: SettingsShellProps) {
  const { currentUser } = useSession();
  const location = useLocation();
  const [showAdvanced, setShowAdvanced] = createSignal(
    typeof window !== "undefined"
      ? window.localStorage.getItem(ADVANCED_SETTINGS_STORAGE_KEY) === "true"
      : false,
  );

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

  const currentItem = createMemo(() =>
    getCurrentSettingsItem(location.pathname),
  );

  const toggleAdvanced = () => {
    const next = !showAdvanced();
    setShowAdvanced(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADVANCED_SETTINGS_STORAGE_KEY, String(next));
    }
  };

  return (
    <section class={styles.root}>
      <aside class={styles.nav}>
        <div class={styles.navScroll}>
          <div class={styles.exitRow}>
            <A
              href={getDefaultAppPath(currentUser().role)}
              class={cn(styles.item, styles.exit)}
            >
              <X class={styles.icon} />
              <span>Exit Settings</span>
            </A>
          </div>

          <For each={["user", "workspace"] as const}>
            {(section) => {
              const sectionItems = createMemo(() => groupedItems()[section]);
              return (
                <Show when={sectionItems().length > 0}>
                  <section class={styles.section}>
                    <h4 class={styles.groupTitle}>
                      {getSettingsSectionLabel(section)}
                    </h4>
                    <For each={sectionItems()}>
                      {(item) => {
                        const Icon = item.icon;
                        const isAdvancedHidden = () =>
                          Boolean(item.advanced) && !showAdvanced();
                        return (
                          <div
                            class={cn(
                              styles.itemWrap,
                              item.advanced && styles.advancedItem,
                              isAdvancedHidden()
                                ? styles.advancedCollapsed
                                : styles.advancedExpanded,
                            )}
                            aria-hidden={isAdvancedHidden()}
                          >
                            <A
                              href={item.href}
                              class={styles.item}
                              activeClass={styles.itemActive}
                              tabindex={isAdvancedHidden() ? -1 : undefined}
                            >
                              <Icon class={styles.icon} />
                              <span>{item.label}</span>
                            </A>
                          </div>
                        );
                      }}
                    </For>
                  </section>
                </Show>
              );
            }}
          </For>
        </div>

        <div class={styles.footer}>
          <div class={styles.advancedRow}>
            <span class={styles.advancedDot} aria-hidden="true" />
            <div class={styles.advancedLabel}>
              <span id="settings-advanced-label">Advanced:</span>
              <button
                type="button"
                role="switch"
                aria-checked={showAdvanced()}
                aria-labelledby="settings-advanced-label"
                class={cn(
                  styles.advancedSwitch,
                  showAdvanced() && styles.advancedSwitchChecked,
                )}
                onClick={toggleAdvanced}
              >
                <span class={styles.advancedSwitchThumb} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div class={styles.main} data-settings-current={currentItem().id}>
        {props.children}
      </div>
    </section>
  );
}
