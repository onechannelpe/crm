import { A } from "@solidjs/router";
import { For, Show } from "solid-js";

import styles from "./app-breadcrumb.module.css";

export interface BreadcrumbLink {
  label: string;
  href?: string;
}

interface AppBreadcrumbProps {
  links: BreadcrumbLink[];
  class?: string;
}

export function AppBreadcrumb(props: AppBreadcrumbProps) {
  return (
    <nav class={`${styles.root} ${props.class ?? ""}`} aria-label="Breadcrumb">
      <For each={props.links}>
        {(link, index) => (
          <>
            <Show
              when={link.href}
              fallback={<span class={styles.text}>{link.label}</span>}
            >
              <A href={link.href!} class={styles.link}>
                {link.label}
              </A>
            </Show>
            <Show when={index() < props.links.length - 1}>
              <span class={styles.divider}>/</span>
            </Show>
          </>
        )}
      </For>
    </nav>
  );
}
