import { Suspense } from "solid-js";

import { AppPage } from "~/components/layout/page";
import { ProtectedSection } from "~/lib/auth/access/protected-section";

import { TeamInviteManagementSection } from "../components/team-invite-management-section";

import styles from "../team-page.module.css";

export default function TeamInvitePage() {
  return (
    <AppPage class={styles.page}>
      <ProtectedSection permission="team:manage">
        <Suspense>
          <TeamInviteManagementSection />
        </Suspense>
      </ProtectedSection>
    </AppPage>
  );
}
