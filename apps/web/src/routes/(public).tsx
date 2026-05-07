import { A } from "@solidjs/router";
import type { RouteSectionProps } from "@solidjs/router";
import { For, Suspense } from "solid-js";

import { ThemeToggle } from "~/components/ui/theme/theme-toggle";
import { PUBLIC_MENU_ITEMS } from "~/features/public/menu/data";

import styles from "./(public).module.css";

export default function PublicLayout(props: RouteSectionProps) {
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
          <ThemeToggle class={styles.themeToggle} />
        </div>
      </header>
      <Suspense>{props.children}</Suspense>
    </main>
  );
}
