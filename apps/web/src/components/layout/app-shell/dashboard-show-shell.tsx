import { useParams, type RouteSectionProps } from "@solidjs/router";

import { AppHeaderActions } from "~/components/layout/app-header/app-header-actions";
import { DashboardShowHeader } from "~/features/dashboards/dashboard-show-header";
import { findDashboard } from "~/features/dashboards/registry";
import { MainContainerWithSidePanel } from "~/features/side-panel/shell/main-container-with-side-panel";
import { SidePanelProvider } from "~/features/side-panel/state/use-side-panel";

import shellStyles from "~/components/layout/shell.module.css";

export function DashboardShowShell(props: RouteSectionProps) {
  const params = useParams<{ dashboardId: string }>();
  const title = () => findDashboard(params.dashboardId)?.title ?? "Panel";

  return (
    <SidePanelProvider>
      <div class={shellStyles.main}>
        <DashboardShowHeader title={title()}>
          <AppHeaderActions />
        </DashboardShowHeader>
        <main class={shellStyles.fixedBody}>
          <MainContainerWithSidePanel>
            {props.children}
          </MainContainerWithSidePanel>
        </main>
      </div>
    </SidePanelProvider>
  );
}
