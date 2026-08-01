import { acceptInvite } from "./accept-invite";
import { createInvite } from "./create-invite";
import { listPendingInvites } from "./list-pending-invites";
import { markInviteDelivered } from "./mark-invite-delivered";
import { redeliverInvite } from "./redeliver-invite";
import { revokeInvite } from "./revoke-invite";
import { createInviteRuntime } from "./runtime";
import type { InviteDeps, InviteService, InviteServiceDeps } from "./types";

export function createInviteService(
  deps: InviteDeps,
  runtimeOverrides: InviteServiceDeps,
): InviteService {
  const runtime = createInviteRuntime(runtimeOverrides);

  return {
    listPendingInvites(branchId, now) {
      return listPendingInvites(deps, runtime, branchId, now);
    },
    createInvite(input, now) {
      return createInvite(deps, runtime, input, now);
    },
    redeliverInvite(input, now) {
      return redeliverInvite(deps, runtime, input, now);
    },
    revokeInvite(input, now) {
      return revokeInvite(deps, runtime, input, now);
    },
    markInviteDelivered(inviteId, now) {
      return markInviteDelivered(deps, runtime, inviteId, now);
    },
    acceptInvite(input, now) {
      return acceptInvite(deps, runtime, input, now);
    },
  };
}
