import { A } from "@solidjs/router";
import type { RouteSectionProps } from "@solidjs/router";
import { Suspense } from "solid-js";

import { ThemeToggle } from "~/components/ui/theme/theme-toggle";

import styles from "./(public).module.css";

export default function PublicLayout(props: RouteSectionProps) {
  return (
    <main class={styles.main}>
      <div class={styles.bar}>
        <A href="/" class={styles.barBtn}>
          ← Regresar
        </A>
        <ThemeToggle class={styles.barBtn} />
      </div>
      <Suspense>{props.children}</Suspense>
    </main>
  );
}
