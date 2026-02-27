import { useLocation } from "@solidjs/router";
import { createMemo } from "solid-js";

import { AppBreadcrumb } from "~/components/layout/app-breadcrumb";
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
      <AppBreadcrumb
        links={[
          {
            label: getSettingsSectionLabel(currentItem().section),
            href: getSettingsSectionHref(currentItem().section),
          },
          { label: currentItem().label },
        ]}
      />
    </header>
  );
}
