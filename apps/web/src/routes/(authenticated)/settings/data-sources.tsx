import { DataSourceUploadSection } from "~/features/data-source-import/data-source-upload-section";
import { SettingsPageLayout } from "~/features/settings-shell/page/settings-page-layout";

export default function DataSourcesPage() {
  return (
    <SettingsPageLayout>
      <DataSourceUploadSection />
    </SettingsPageLayout>
  );
}
