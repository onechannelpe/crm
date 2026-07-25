import { useAction, useNavigate, useSubmission } from "@solidjs/router";
import { Match, Switch } from "solid-js";

import { downloadWithToken } from "~/browser/files/client";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { actionErrorMessage } from "~/contracts/errors";
import {
  TabStrip,
  type TabItem,
} from "~/features/side-panel/components/tab-strip";

import { CulqiView } from "./culqi/culqi-view";
import { requestMerchantGpvExportMutation } from "./data/mutations";
import { type GpvTabId, useGpvView } from "./gpv-view";
import { AttributionGrid } from "./grids/attribution-grid";
import { CohortGrid } from "./grids/cohort-grid";
import { PerformanceTab } from "./performance-tab";
import { refreshPublishedGpvData } from "./revalidate";

import styles from "./merchant-gpv-dashboard.module.css";

const GPV_TABS: ReadonlyArray<TabItem<GpvTabId>> = [
  { id: "rendimiento", label: "Rendimiento" },
  { id: "cohortes", label: "Cohortes" },
  { id: "atribucion", label: "Atribución" },
  { id: "culqi", label: "Vista Culqi" },
];

export function MerchantGpvDashboard() {
  const view = useGpvView();
  const navigate = useNavigate();
  const requestExport = useAction(requestMerchantGpvExportMutation);
  const exportSubmission = useSubmission(requestMerchantGpvExportMutation);
  const { enqueueErrorSnackBar } = useSnackBar();

  const exportReport = async () => {
    try {
      const { token } = await requestExport(view.filter());
      downloadWithToken(token);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  };

  return (
    <AppPage>
      <TabStrip
        tabs={GPV_TABS}
        activeTab={view.tab()}
        onTabSelect={view.setTab}
        rightComponent={
          <div class={styles.tabActions}>
            <Button
              variant="secondary"
              loading={exportSubmission.pending}
              onClick={() => void exportReport()}
            >
              Exportar resultado
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate("/dashboards/merchant-gpv/imports/new")}
            >
              Importar reporte
            </Button>
            <Button
              variant="secondary"
              onClick={() => void refreshPublishedGpvData()}
            >
              Recargar
            </Button>
          </div>
        }
      />

      <Switch>
        <Match when={view.tab() === "rendimiento"}>
          <PerformanceTab view={view} />
        </Match>
        <Match when={view.tab() === "cohortes"}>
          <CohortGrid view={view} />
        </Match>
        <Match when={view.tab() === "atribucion"}>
          <AttributionGrid view={view} />
        </Match>
        <Match when={view.tab() === "culqi"}>
          <CulqiView view={view} />
        </Match>
      </Switch>
    </AppPage>
  );
}
