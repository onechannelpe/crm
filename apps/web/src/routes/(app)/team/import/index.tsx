import { Suspense } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { ProtectedSection } from "~/lib/auth/access/protected-section";

import { BulkImportSection } from "../components/bulk-import-section";

import styles from "../team-page.module.css";

export default function TeamImportPage() {
  return (
    <AppPage class={styles.page}>
      <ProtectedSection permission="team:manage">
        <Suspense>
          <BulkImportSection />
        </Suspense>
      </ProtectedSection>
    </AppPage>
  );
}
