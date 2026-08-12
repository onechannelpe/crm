import {
  acceptInvitePasswordStep as acceptInvitePasswordStepInRequest,
  getInviteActivationView as getInviteActivationViewInRequest,
} from "~/server/auth/ui/invites";

export async function getInviteActivationView(token: unknown) {
  "use server";

  return getInviteActivationViewInRequest(token);
}

export async function acceptInvitePasswordStep(input: unknown) {
  "use server";

  return acceptInvitePasswordStepInRequest(input);
}
