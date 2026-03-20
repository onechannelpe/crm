import { useNavigate } from "@solidjs/router";
import {
  For,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";

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

const CLOSED_SECTIONS_STORAGE_KEY = "crm-nav-closed-sections";

function loadClosedSections(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const stored = window.localStorage.getItem(CLOSED_SECTIONS_STORAGE_KEY) ?? "";
  return new Set(stored.split(",").filter(Boolean));
}

function saveClosedSections(closed: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLOSED_SECTIONS_STORAGE_KEY, [...closed].join(","));
}

export function MainNavigationDrawer() {
  const { currentUser } = useSession();
  const navigate = useNavigate();
  const { expanded, isMobile, setExpanded } = useNavigationDrawerState();

  const primaryEntries = createMemo(() => getMainPrimaryEntries(currentUser().role));
  const secondaryGroups = createMemo(() =>
    getMainSecondaryGroups(currentUser().role),
  );

  const [closedSections, setClosedSections] = createSignal<Set<string>>(new Set());

  onMount(() => setClosedSections(loadClosedSections()));

  const isSectionOpen = (label: string) => !closedSections().has(label);

  const toggleSection = (label: string) => {
    const next = new Set(closedSections());

    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }

    setClosedSections(next);
    saveClosedSections(next);
  };

  const closeOnNavigate = () => {
    if (isMobile()) {
      setExpanded(false);
    }
  };

  return (
    <NavigationDrawerShell
      isSettings={false}
      onSearch={() => {
        navigate("/search");
        closeOnNavigate();
      }}
    >
      <div class={styles.scrollable}>
        <section class={styles.section}>
          <For each={primaryEntries()}>
            {(item) => (
              <NavigationDrawerItem
                item={item}
                expanded={expanded() || isMobile()}
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
                expanded={expanded() || isMobile()}
                open={isMobile() || isSectionOpen(group.label)}
                onToggle={() => toggleSection(group.label)}
              >
                <For each={group.items}>
                  {(item) => (
                    <NavigationDrawerItem
                      item={item}
                      expanded={expanded() || isMobile()}
                      sectionOpen={isMobile() || isSectionOpen(group.label)}
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
            expanded={expanded() || isMobile()}
            open={true}
            onToggle={() => undefined}
          >
            <a
              href="/settings/profile"
              class={styles.item}
              onClick={closeOnNavigate}
            >
              <Settings size={16} />
              <span class={cn(styles.itemLabel, !expanded() && !isMobile() && styles.itemLabelCollapsed)}>
                Ajustes
              </span>
            </a>
            <a
              href="https://github.com/twentyhq/twenty"
              target="_blank"
              rel="noopener noreferrer"
              class={styles.item}
              onClick={closeOnNavigate}
            >
              <CircleQuestionMark size={16} />
              <span class={cn(styles.itemLabel, !expanded() && !isMobile() && styles.itemLabelCollapsed)}>
                Documentación
              </span>
            </a>
          </DrawerSection>
        </section>
      </div>
    </NavigationDrawerShell>
  );
}
