import { A } from "@solidjs/router";
import { For, Show } from "solid-js";

import type { BreadcrumbItem, MobileBackAction } from "./breadcrumb-model";
import { MobileBackControl } from "./mobile-breadcrumb";

import styles from "./breadcrumb.module.css";

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  mobileBackAction: MobileBackAction;
  class?: string;
  isMobile?: boolean;
}

export function Breadcrumb(props: BreadcrumbProps) {
  if (props.isMobile) {
    return (
      <MobileBackControl action={props.mobileBackAction} class={props.class} />
    );
  }

  return (
    <nav class={`${styles.root} ${props.class ?? ""}`} aria-label="Breadcrumb">
      <For each={props.items}>
        {(item, index) => (
          <span class={styles.segment}>
            <Show
              when={item.href}
              fallback={
                <span class={styles.text} title={item.label}>
                  {item.label}
                </span>
              }
            >
              {(href) => (
                <span class={styles.linkContainer}>
                  <A href={href()} class={styles.link} title={item.label}>
                    {item.label}
                  </A>
                </span>
              )}
            </Show>
            <Show when={index() < props.items.length - 1}>
              <span class={styles.divider}>/</span>
            </Show>
          </span>
        )}
      </For>
    </nav>
  );
}
