import { action, json } from "@solidjs/router";

import {
  startImpersonation,
  stopImpersonation,
} from "~/actions/users/impersonation.action";
import {
  changeMemberRole,
  deactivateMember,
  deleteMember,
  reactivateMember,
  updateMemberExpiry,
  updateMemberProfile,
} from "~/actions/users/write.action";
import type {
  ChangeMemberRoleInput,
  UpdateMemberExpiryInput,
  UpdateMemberProfileInput,
} from "~/contracts/members";
import {
  memberDetailQuery,
  membersRosterQuery,
} from "~/features/team-management/data/queries";

const revalidateMember = [membersRosterQuery.key, memberDetailQuery.key];

export const updateMemberProfileMutation = action(
  async (input: UpdateMemberProfileInput) => {
    const { message } = await updateMemberProfile(input);
    return json({ message }, { revalidate: revalidateMember });
  },
  "updateMemberProfile",
);

export const changeMemberRoleMutation = action(
  async (input: ChangeMemberRoleInput) => {
    const { message } = await changeMemberRole(input);
    return json({ message }, { revalidate: revalidateMember });
  },
  "changeMemberRole",
);

export const deactivateMemberMutation = action(async (userId: string) => {
  const { message } = await deactivateMember(userId);
  return json({ message }, { revalidate: revalidateMember });
}, "deactivateMember");

export const reactivateMemberMutation = action(async (userId: string) => {
  const { message } = await reactivateMember(userId);
  return json({ message }, { revalidate: revalidateMember });
}, "reactivateMember");

export const updateMemberExpiryMutation = action(
  async (input: UpdateMemberExpiryInput) => {
    const { message } = await updateMemberExpiry(input);
    return json({ message }, { revalidate: revalidateMember });
  },
  "updateMemberExpiry",
);

export const deleteMemberMutation = action(async (userId: string) => {
  const { message } = await deleteMember(userId);
  return json({ message }, { revalidate: membersRosterQuery.key });
}, "deleteMember");

export const startImpersonationMutation = action(async (userId: string) => {
  const { message } = await startImpersonation(userId);
  return json({ message });
}, "startImpersonation");

export const stopImpersonationMutation = action(async () => {
  const { message } = await stopImpersonation();
  return json({ message });
}, "stopImpersonation");
