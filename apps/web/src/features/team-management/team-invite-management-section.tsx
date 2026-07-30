import { createAsync } from "@solidjs/router";
import { Show } from "solid-js";

import { SettingsSection } from "~/components/settings/SettingsSection";
import { inviteManagementQuery } from "~/features/team-management/data/invite-management.query";

import { InviteForm } from "./invite-form";
import { PendingInvitesTable } from "./pending-invites-table";

export function TeamInviteManagementSection() {
  const inviteManagement = createAsync(() => inviteManagementQuery());

  return (
    <Show when={inviteManagement()}>
      {(im) => (
        <SettingsSection
          title="Invitar por correo"
          description="Envía una invitación por correo a nuevos miembros del equipo."
        >
          <InviteForm setup={im()} evaluatedAt={im().evaluatedAt} />
          <PendingInvitesTable
            invites={im().pendingInvites}
            evaluatedAt={im().evaluatedAt}
          />
        </SettingsSection>
      )}
    </Show>
  );
}
