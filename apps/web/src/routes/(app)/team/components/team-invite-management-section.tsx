import { createAsync } from "@solidjs/router";
import { Show } from "solid-js";

import { inviteManagementQuery } from "~/lib/queries/team";

import { InviteForm } from "./invite-form";
import { PendingInvitesTable } from "./pending-invites-table";

export function TeamInviteManagementSection() {
  const inviteManagement = createAsync(() => inviteManagementQuery());

  return (
    <Show when={inviteManagement()}>
      {(im) => (
        <>
          <InviteForm setup={im()} />
          <PendingInvitesTable invites={im().pendingInvites} />
        </>
      )}
    </Show>
  );
}
