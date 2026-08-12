import type { ParentProps } from "solid-js";

import { useSidePanelHotkeys } from "~/features/side-panel/hooks/use-side-panel-hotkeys";
import { SidePanelHost } from "~/features/side-panel/shell/host";

import styles from "./main-app-layout-with-side-panel.module.css";

/*
  The page and the side panel share one row: the panel animates its own width,
  so the page reflows instead of being covered. One instance serves every
  signed-in route, which is what keeps the panel open across navigation and
  gives the command menu hotkeys a single mount point.
*/
export function MainAppLayoutWithSidePanel(props: ParentProps) {
  useSidePanelHotkeys();

  return (
    <div class={styles.row}>
      <main class={styles.content}>{props.children}</main>
      <SidePanelHost />
    </div>
  );
}
