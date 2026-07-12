import { createAsync } from "@solidjs/router";
import { Show } from "solid-js";

import { SettingsSection } from "~/components/settings/SettingsSection";
import { inviteManagementQuery } from "~/lib/queries/team";

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
          <InviteForm setup={im()} />
          <PendingInvitesTable invites={im().pendingInvites} />
        </SettingsSection>
      )}
    </Show>
  );
}
