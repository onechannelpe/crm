import { createAsync } from "@solidjs/router";
import { ErrorBoundary, Show, Suspense, createSignal } from "solid-js";

import { Loading } from "~/components/feedback/loading";
import { AppPage } from "~/components/layout/page";
import { isAppError } from "~/lib/app-errors";
import { teamMembersQuery } from "~/lib/queries/team";

import { BulkImportSection } from "./components/bulk-import-section";
import { TeamInviteManagementSection } from "./components/team-invite-management-section";
import { TeamMembersSection } from "./components/team-members-section";

import styles from "./team-page.module.css";

export default function TeamPage() {
  const members = createAsync(() => teamMembersQuery());
  const [searchFilter, setSearchFilter] = createSignal("");

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
      <Show when={members()} fallback={<Loading />} keyed>
        {(m) => (
          <TeamMembersSection
            members={m}
            searchFilter={searchFilter()}
            onSearchFilterInput={setSearchFilter}
          />
        )}
      </Show>
    </AppPage>
  );
}
