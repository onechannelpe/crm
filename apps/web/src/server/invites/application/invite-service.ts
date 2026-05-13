import { acceptInvite } from "./accept-invite";
import { createInvite } from "./create-invite";
import { listPendingInvites } from "./list-pending-invites";
import { markInviteDelivered } from "./mark-invite-delivered";
import { resendInvite } from "./resend-invite";
import { revokeInvite } from "./revoke-invite";
import { createInviteRuntime } from "./runtime";
import type { InviteDeps, InviteService, InviteServiceDeps } from "./types";

export function createInviteService(
  deps: InviteDeps,
  runtimeOverrides: InviteServiceDeps,
): InviteService {
  const runtime = createInviteRuntime(deps, runtimeOverrides);

  return {
    listPendingInvites(branchId) {
      return listPendingInvites(deps, runtime, branchId);
    },
    createInvite(input) {
      return createInvite(deps, runtime, input);
    },
    resendInvite(input) {
      return resendInvite(deps, runtime, input);
    },
    revokeInvite(input) {
      return revokeInvite(deps, runtime, input);
    },
    markInviteDelivered(inviteId) {
      return markInviteDelivered(deps, runtime, inviteId);
    },
    acceptInvite(input) {
      return acceptInvite(deps, runtime, input);
    },
  };
}
