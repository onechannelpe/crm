import { acceptInvite } from "./accept-invite";
import { createInvite } from "./create-invite";
import { listPendingInvites } from "./list-pending-invites";
import { markInviteDelivered } from "./mark-invite-delivered";
import { redeliverInvite } from "./redeliver-invite";
import { revokeInvite } from "./revoke-invite";
import { createInviteRuntime } from "./runtime";
import type {
  InviteBaseRepos,
  InviteService,
  InviteServiceDeps,
} from "./types";

export function createInviteService(
  repos: InviteBaseRepos,
  runtimeOverrides: InviteServiceDeps,
): InviteService {
  const runtime = createInviteRuntime(runtimeOverrides);

  return {
    listPendingInvites(branchId, operation) {
      return listPendingInvites(repos, branchId, operation);
    },
    createInvite(input, operation) {
      return createInvite(runtime, input, operation);
    },
    redeliverInvite(input, operation) {
      return redeliverInvite(runtime, input, operation);
    },
    revokeInvite(input, operation) {
      return revokeInvite(runtime, input, operation);
    },
    markInviteDelivered(inviteId, operation) {
      return markInviteDelivered(runtime, inviteId, operation);
    },
    acceptInvite(input, operation) {
      return acceptInvite(runtime, input, operation);
    },
  };
}
