import { A, type RouteSectionProps, useLocation } from "@solidjs/router";
import { createMemo, For, type JSX, Show } from "solid-js";

import SettingsIcon from "~/components/icons/settings";
import ShieldCheck from "~/components/icons/shield-check";
import UserIcon from "~/components/icons/user";
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
  section: "User" | "Workspace";
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "profile",
    label: "Profile",
    href: "/settings/profile",
    icon: UserIcon,
    section: "User",
  },
  {
    id: "security",
    label: "Security",
    href: "/settings/security",
    icon: ShieldCheck,
    section: "User",
  },
  {
    id: "general",
    label: "General",
    href: "/settings/general",
    icon: SettingsIcon,
    section: "Workspace",
  },
  {
    id: "login-protection",
    label: "Login Protection",
    href: "/settings/login-protection",
    icon: ShieldCheck,
    section: "Workspace",
  },
];

export default function SettingsLayout(props: RouteSectionProps) {
  const { currentUser } = useSession();
  const location = useLocation();

  const currentItem = createMemo(
    () =>
      NAV_ITEMS.find((item) => location.pathname.startsWith(item.href)) ??
      NAV_ITEMS[0],
  );

  return (
    <AppPage>
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

            <For each={["User", "Workspace"] as const}>
              {(section) => {
                const sectionItems = NAV_ITEMS.filter(
                  (item) =>
                    item.section === section &&
                    canAccessPath(currentUser().role, item.href),
                );
                return (
                  <Show when={sectionItems.length > 0}>
                    <section class={styles.section}>
                      <h4 class={styles.groupTitle}>{section}</h4>
                      <For each={sectionItems}>
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
                  </Show>
                );
              }}
            </For>
          </div>
        </aside>

        <div class={styles.page}>
          <div class={styles.topbar}>
            <nav class={styles.crumbs}>
              <span>{currentItem().section}</span>
              <span class={styles.crumbSeparator}>/</span>
              <span class={styles.crumbCurrent}>{currentItem().label}</span>
            </nav>
          </div>
          <div class={styles.contentScroll}>{props.children}</div>
        </div>
      </section>
    </AppPage>
  );
}
