import type { RouteSectionProps } from "@solidjs/router";

import { AppHeader } from "~/components/layout/app-header/app-header";
import { MainContainerWithSidePanel } from "~/features/side-panel/shell/main-container-with-side-panel";
import { SidePanelProvider } from "~/features/side-panel/state/use-side-panel";

import shellStyles from "../shell.module.css";

export function StandardAppShell(props: RouteSectionProps) {
  return (
    <SidePanelProvider>
      <div class={shellStyles.main}>
        <main class={shellStyles.fixedBody}>
          <MainContainerWithSidePanel header={<AppHeader />}>
            {props.children}
          </MainContainerWithSidePanel>
        </main>
      </div>
    </SidePanelProvider>
  );
}
