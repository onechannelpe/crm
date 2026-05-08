import { A } from "@solidjs/router";
import type { RouteSectionProps } from "@solidjs/router";
import { For, Suspense, createSignal, onCleanup, onMount } from "solid-js";

import { ThemeToggle } from "~/components/ui/theme/theme-toggle";
import { PUBLIC_MENU_ITEMS } from "~/features/public/menu/data";

import styles from "./(public).module.css";

export default function PublicLayout(props: RouteSectionProps) {
  const [hasScrolled, setHasScrolled] = createSignal(false);

  onMount(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", handleScroll));
  });

  return (
    <main class={styles.main}>
      <header
        classList={{ [styles.header]: true, [styles.elevated]: hasScrolled() }}
      >
        <div class={styles.headerContainer}>
          <div class={styles.navSurface}>
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
              <A href="/login" class={styles.ctaGhost}>
                Log in
              </A>
              <A href="/login" class={styles.ctaPrimary}>
                Get started
              </A>
              <ThemeToggle class={styles.themeToggle} />
            </div>
          </div>
        </div>
      </header>
      <Suspense>{props.children}</Suspense>
    </main>
  );
}
