import { A, useLocation } from "@solidjs/router";
import { createMemo } from "solid-js";

import {
  getCurrentSettingsItem,
  getSettingsSectionHref,
  getSettingsSectionLabel,
} from "~/components/layout/settings-nav";

import styles from "./shell.module.css";

export function SettingsTopbar() {
  const location = useLocation();
  const currentItem = createMemo(() =>
    getCurrentSettingsItem(location.pathname),
  );

  return (
    <header class={styles.settingsTopbar}>
      <nav class={styles.settingsCrumbs} aria-label="Breadcrumb">
        <A
          href={getSettingsSectionHref(currentItem().section)}
          class={styles.settingsCrumbLink}
        >
          {getSettingsSectionLabel(currentItem().section)}
        </A>
        <span class={styles.settingsCrumbSeparator}>/</span>
        <span class={styles.settingsCrumbCurrent}>{currentItem().label}</span>
      </nav>
    </header>
  );
}
