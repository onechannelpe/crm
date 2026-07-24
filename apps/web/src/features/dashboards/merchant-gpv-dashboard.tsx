import { createSignal, Match, Show, Switch } from "solid-js";

import { requestMerchantGpvExportDownloadToken } from "~/actions/dashboards/dashboard";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import {
  TabStrip,
  type TabItem,
} from "~/features/side-panel/components/tab-strip";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";
import { downloadWithToken } from "~/lib/files/client";
import { actionErrorMessage } from "~/lib/wire-error";

import { CulqiView } from "./culqi/culqi-view";
import { type GpvTabId, useGpvView } from "./gpv-view";
import { AttributionGrid } from "./grids/attribution-grid";
import { CohortGrid } from "./grids/cohort-grid";
import { PerformanceTab } from "./performance-tab";
import { revalidateGpvData } from "./revalidate";
import { UploadReport } from "./upload/upload-report";

import styles from "./merchant-gpv-dashboard.module.css";

const GPV_TABS: ReadonlyArray<TabItem<GpvTabId>> = [
  { id: "rendimiento", label: "Rendimiento" },
  { id: "cohortes", label: "Cohortes" },
  { id: "atribucion", label: "Atribución" },
  { id: "culqi", label: "Vista Culqi" },
];

export function MerchantGpvDashboard() {
  const view = useGpvView();
  const [showUpload, setShowUpload] = createSignal(false);
  const [exporting, setExporting] = createSignal(false);
  const { enqueueErrorSnackBar } = useSnackBar();

  const exportReport = async () => {
    setExporting(true);
    try {
      const { token } = await requestMerchantGpvExportDownloadToken({
        filter: view.filter(),
      });
      downloadWithToken(token);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      setExporting(false);
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
              loading={exporting()}
              onClick={() => void exportReport()}
            >
              Exportar resultado
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowUpload((v) => !v)}
            >
              Importar reporte
            </Button>
            <Button
              variant="secondary"
              onClick={() => void revalidateGpvData()}
            >
              Recargar
            </Button>
          </div>
        }
      />

      <Show when={showUpload()}>
        <div class={styles.uploadBand}>
          <WidgetCardShell title="Importar reporte GPV">
            <UploadReport onClose={() => setShowUpload(false)} />
          </WidgetCardShell>
        </div>
      </Show>

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
