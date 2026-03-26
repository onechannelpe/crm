import type { RouteSectionProps } from "@solidjs/router";

import shellStyles from "../shell.module.css";

export function SettingsAppShell(props: RouteSectionProps) {
  return (
    <div class={shellStyles.main}>
      <main class={shellStyles.settingsBody}>{props.children}</main>
    </div>
  );
}
