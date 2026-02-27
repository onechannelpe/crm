import { type RouteSectionProps, useLocation } from "@solidjs/router";
import { createMemo } from "solid-js";

import { getCurrentSettingsItem } from "~/components/layout/settings-nav";

import styles from "./settings/settings-layout.module.css";

export default function SettingsLayout(props: RouteSectionProps) {
  const location = useLocation();

  const currentItem = createMemo(() =>
    getCurrentSettingsItem(location.pathname),
  );

  return (
    <div class={styles.contentScroll}>
      <h1 class={styles.pageTitle}>{currentItem().label}</h1>
      {props.children}
    </div>
  );
}
