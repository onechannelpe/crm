import type { RouteSectionProps } from "@solidjs/router";

import { MainContainerWithSidePanel } from "~/features/side-panel/shell/main-container-with-side-panel";
import { SidePanelProvider } from "~/features/side-panel/state/use-side-panel";

import { RecordIndexShellSkeleton } from "./skeletons/record-index-shell-skeleton";

import shellStyles from "../shell.module.css";

export function RecordIndexAppShell(props: RouteSectionProps) {
  return (
    <SidePanelProvider>
      <div class={shellStyles.main}>
        <main class={shellStyles.fixedBody}>
          <MainContainerWithSidePanel fallback={<RecordIndexShellSkeleton />}>
            {props.children}
          </MainContainerWithSidePanel>
        </main>
      </div>
    </SidePanelProvider>
  );
}
