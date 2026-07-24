import { AppPage, AppPageSection } from "~/components/layout/page";
import { UploadReport } from "~/features/merchant-gpv/upload/upload-report";
import { WidgetCardShell } from "~/features/widgets/widget-card-shell";

export default function NewMerchantGpvImportRoute() {
  return (
    <AppPage>
      <AppPageSection>
        <WidgetCardShell title="Importar reporte GPV">
          <UploadReport />
        </WidgetCardShell>
      </AppPageSection>
    </AppPage>
  );
}
