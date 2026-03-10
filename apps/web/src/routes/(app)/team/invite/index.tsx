import { ErrorBoundary, Suspense } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { isAppError } from "~/lib/app-errors";

import { BulkImportSection } from "../components/bulk-import-section";
import { TeamInviteManagementSection } from "../components/team-invite-management-section";

import styles from "../team-page.module.css";

export default function TeamInvitePage() {
  return (
    <AppPage class={styles.page}>
      <ErrorBoundary
        fallback={(err) => {
          if (isAppError(err) && err.code === "forbidden") return null;
          throw err;
        }}
      >
        <Suspense>
          <TeamInviteManagementSection />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary
        fallback={(err) => {
          if (isAppError(err) && err.code === "forbidden") return null;
          throw err;
        }}
      >
        <Suspense>
          <BulkImportSection />
        </Suspense>
      </ErrorBoundary>
    </AppPage>
  );
}
