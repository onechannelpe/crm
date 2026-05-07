import { A, createAsync } from "@solidjs/router";
import type { RouteSectionProps } from "@solidjs/router";
import { For, Suspense } from "solid-js";

import { ThemeToggle } from "~/components/ui/theme/theme-toggle";
import {
  PUBLIC_MENU_ITEMS,
  PUBLIC_SOCIAL_LINKS,
} from "~/features/public/menu/data";
import { fetchCommunityStats } from "~/lib/community/fetch-community-stats";
import { mergeSocialLinkLabels } from "~/lib/community/merge-social-link-labels";

import styles from "./(public).module.css";

export default function PublicLayout(props: RouteSectionProps) {
  const stats = createAsync(() => fetchCommunityStats());

  const socialLinks = () =>
    mergeSocialLinkLabels(PUBLIC_SOCIAL_LINKS, {
      github: stats()?.github ?? "",
      discord: stats()?.discord ?? "",
    });

  return (
    <main class={styles.main}>
      <header class={styles.header}>
        <A href="/" class={styles.logo}>
          Culqi360
        </A>
        <nav class={styles.nav} aria-label="Public">
          <For each={PUBLIC_MENU_ITEMS}>
            {(item) => (
              <A href={item.href} class={styles.navLink}>
                {item.label}
              </A>
            )}
          </For>
        </nav>
        <div class={styles.rightControls}>
          <nav class={styles.social} aria-label="Social">
            <For each={socialLinks()}>
              {(item) => (
                <a
                  href={item.href}
                  rel="noopener noreferrer"
                  target="_blank"
                  class={styles.socialLink}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              )}
            </For>
          </nav>
          <ThemeToggle class={styles.themeToggle} />
        </div>
      </header>
      <Suspense>{props.children}</Suspense>
    </main>
  );
}
