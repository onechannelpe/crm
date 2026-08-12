import type { ParentProps } from "solid-js";

import { useSidePanelHotkeys } from "~/features/side-panel/hooks/use-side-panel-hotkeys";
import { SidePanelHost } from "~/features/side-panel/shell/host";

import styles from "./main-app-layout-with-side-panel.module.css";

// The panel shares layout space with the page, so content reflows as it opens.
// This layout stays mounted across signed-in routes to preserve panel state.
export function MainAppLayoutWithSidePanel(props: ParentProps) {
  useSidePanelHotkeys();

  return (
    <div class={styles.row}>
      <main class={styles.content}>{props.children}</main>
      <SidePanelHost />
    </div>
  );
}
