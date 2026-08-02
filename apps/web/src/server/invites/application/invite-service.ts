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
    listPendingInvites(branchId, operation) {
      return listPendingInvites(deps, runtime, branchId, operation);
    },
    createInvite(input, operation) {
      return createInvite(deps, runtime, input, operation);
    },
    redeliverInvite(input, operation) {
      return redeliverInvite(deps, runtime, input, operation);
    },
    revokeInvite(input, operation) {
      return revokeInvite(deps, runtime, input, operation);
    },
    markInviteDelivered(inviteId, operation) {
      return markInviteDelivered(deps, runtime, inviteId, operation);
    },
    acceptInvite(input, operation) {
      return acceptInvite(deps, runtime, input, operation);
    },
  };
}
