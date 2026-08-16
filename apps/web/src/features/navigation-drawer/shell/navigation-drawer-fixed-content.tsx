import { clsx } from "clsx";
import { type ParentProps } from "solid-js";

import { NavigationDrawerSection } from "../section/navigation-drawer-section";
import { useNavigationDrawerState } from "../state/navigation-drawer-provider";

import styles from "./navigation-drawer-shell.module.css";

export function NavigationDrawerFixedContent(props: ParentProps) {
  const { isMobile } = useNavigationDrawerState();

  return (
    <div
      class={clsx(styles.fixedContent, isMobile() && styles.fixedContentMobile)}
    >
      <NavigationDrawerSection>{props.children}</NavigationDrawerSection>
    </div>
  );
}
