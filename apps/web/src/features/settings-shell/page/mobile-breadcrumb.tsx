import { A } from "@solidjs/router";

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
  const shouldRedirectToSettings = () => props.links.length === 2;
  const previousHref = () => previousLink()?.href;

  const text = () => {
    const prev = previousLink();
    return typeof prev?.children === "string" ? prev.children : "";
  };

  return (
    <nav class={`${styles.root} ${props.class ?? ""}`} aria-label="Breadcrumb">
      <ChevronLeft size={16} />
      {shouldRedirectToSettings() ? (
        <span
          class={styles.mobileBack}
          onClick={() => {
            setExpanded(true);
            setCurrentMobileDrawer("settings");
          }}
        >
          Volver a ajustes
        </span>
      ) : previousHref() ? (
        <A class={styles.link} href={previousHref() as string} title={text()}>
          Volver a {previousLink()!.children}
        </A>
      ) : (
        <span class={styles.text} title={text()}>
          {previousLink()?.children}
        </span>
      )}
    </nav>
  );
}
