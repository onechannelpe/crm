import { Title } from "@solidjs/meta";
import { type RouteSectionProps } from "@solidjs/router";

import { AppHeaderActions } from "~/components/layout/app-header/app-header-actions";
import { MerchantGpvHeader } from "~/features/dashboards/merchant-gpv-header";
import { MainContainerWithSidePanel } from "~/features/side-panel/shell/main-container-with-side-panel";
import { SidePanelProvider } from "~/features/side-panel/state/use-side-panel";

import shellStyles from "~/components/layout/shell.module.css";

export function MerchantGpvShell(props: RouteSectionProps) {
  return (
    <SidePanelProvider>
      <Title>GPV de comercios</Title>
      <div class={shellStyles.main}>
        <main class={shellStyles.fixedBody}>
          <MainContainerWithSidePanel
            header={
              <MerchantGpvHeader title="GPV de comercios">
                <AppHeaderActions />
              </MerchantGpvHeader>
            }
          >
            {props.children}
          </MainContainerWithSidePanel>
        </main>
      </div>
    </SidePanelProvider>
  );
}
