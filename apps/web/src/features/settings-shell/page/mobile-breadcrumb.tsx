import { A } from "@solidjs/router";
import { Show } from "solid-js";

import ChevronLeft from "~/components/icons/chevron-left";
import { useNavigationDrawerState } from "~/features/navigation-drawer";

import type { BreadcrumbLink } from "./breadcrumb";

import styles from "./breadcrumb.module.css";

interface MobileBreadcrumbProps {
  links: BreadcrumbLink[];
  class?: string;
}

export function MobileBreadcrumb(props: MobileBreadcrumbProps) {
  const { setExpanded, setCurrentMobileDrawer } = useNavigationDrawerState();

  const previousLink = () => props.links[props.links.length - 2];
  const previousHref = () => {
    const link = previousLink();
    return link?.href;
  };
  const shouldOpenSettingsDrawer = () =>
    props.links.length === 2 && Boolean(previousHref());

  const text = () => {
    const prev = previousLink();
    return typeof prev?.children === "string" ? prev.children : "";
  };
  const openSettingsDrawer = () => {
    setExpanded(true);
    setCurrentMobileDrawer("settings");
  };

  return (
    <nav class={`${styles.root} ${props.class ?? ""}`} aria-label="Breadcrumb">
      <ChevronLeft size={16} />
      {shouldOpenSettingsDrawer() ? (
        <button
          type="button"
          class={styles.mobileBack}
          onClick={openSettingsDrawer}
        >
          Volver a ajustes
        </button>
      ) : (
        <Show
          when={previousHref()}
          keyed
          fallback={
            <span class={styles.text} title={text()}>
              {previousLink()?.children}
            </span>
          }
        >
          {(href) => (
            <A class={styles.link} href={href} title={text()}>
              Volver a {previousLink()?.children}
            </A>
          )}
        </Show>
      )}
    </nav>
  );
}
