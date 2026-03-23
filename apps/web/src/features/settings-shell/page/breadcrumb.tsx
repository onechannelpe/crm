import { A } from "@solidjs/router";
import { For, Show, type JSX } from "solid-js";

import { MobileBreadcrumb } from "./mobile-breadcrumb";

import styles from "./breadcrumb.module.css";

export interface BreadcrumbLink {
  children: string | JSX.Element;
  href?: string;
}

interface BreadcrumbProps {
  links: BreadcrumbLink[];
  class?: string;
  isMobile?: boolean;
}

export function Breadcrumb(props: BreadcrumbProps) {
  if (props.isMobile && props.links.length > 0) {
    return <MobileBreadcrumb links={props.links} class={props.class} />;
  }

  return (
    <nav class={`${styles.root} ${props.class ?? ""}`} aria-label="Breadcrumb">
      <For each={props.links}>
        {(link, index) => {
          const text = typeof link.children === "string" ? link.children : "";

          return (
            <>
              {link.href ? (
                <span class={styles.linkContainer}>
                  <A href={link.href} class={styles.link} title={text}>
                    {link.children}
                  </A>
                </span>
              ) : (
                <span class={styles.text} title={text}>
                  {link.children}
                </span>
              )}
              <Show when={index() < props.links.length - 1}>
                <span class={styles.divider}>/</span>
              </Show>
            </>
          );
        }}
      </For>
    </nav>
  );
}
