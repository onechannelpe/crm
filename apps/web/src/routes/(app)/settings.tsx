import { A, type RouteSectionProps, useLocation } from "@solidjs/router";
import { createMemo, For, type JSX, Show } from "solid-js";

import SettingsIcon from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import X from "~/components/icons/x";
import { AppPage } from "~/components/layout/page";
import { useSession } from "~/components/providers/session-provider";
import {
  canAccessPath,
  getDefaultAppPath,
} from "~/lib/auth/access/route-policy";
import { cn } from "~/lib/utils";

import styles from "./settings/settings-page.module.css";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: (props: { class?: string }) => JSX.Element;
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "general",
    label: "General",
    href: "/settings/general",
    icon: SettingsIcon,
  },
  {
    id: "security",
    label: "Security",
    href: "/settings/security",
    icon: ShieldCheck,
  },
];

export default function SettingsLayout(props: RouteSectionProps) {
  const { currentUser } = useSession();
  const location = useLocation();

  const canSeeSettings = createMemo(() =>
    canAccessPath(currentUser().role, "/settings"),
  );

  const currentItem = createMemo(
    () =>
      NAV_ITEMS.find((item) => location.pathname.startsWith(item.href)) ??
      NAV_ITEMS[0],
  );

  return (
    <AppPage>
      <Show
        when={canSeeSettings()}
        fallback={
          <section class={styles.noAccess}>
            You do not have permission to access settings.
          </section>
        }
      >
        <section class={styles.layout}>
          <aside class={styles.nav}>
            <div class={styles.navScroll}>
              <A
                href={getDefaultAppPath(currentUser().role)}
                class={cn(styles.item, styles.exit)}
              >
                <X class={styles.icon} />
                <span>Exit settings</span>
              </A>

              <section class={styles.section}>
                <h4 class={styles.groupTitle}>Workspace</h4>
                <For each={NAV_ITEMS}>
                  {(item) => {
                    const Icon = item.icon;
                    return (
                      <A
                        href={item.href}
                        class={styles.item}
                        activeClass={styles.itemActive}
                      >
                        <Icon class={styles.icon} />
                        <span>{item.label}</span>
                      </A>
                    );
                  }}
                </For>
              </section>
            </div>
          </aside>

          <div class={styles.page}>
            <div class={styles.topbar}>
              <nav class={styles.crumbs}>
                <span>Workspace</span>
                <span>/</span>
                <span class={styles.crumbCurrent}>{currentItem().label}</span>
              </nav>
            </div>
            <div class={styles.contentScroll}>{props.children}</div>
          </div>
        </section>
      </Show>
    </AppPage>
  );
}
