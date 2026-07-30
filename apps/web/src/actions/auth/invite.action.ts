import {
  acceptInvitePasswordStep as acceptInvitePasswordStepInRequest,
  getInviteActivationView as getInviteActivationViewInRequest,
} from "~/server/auth/ui/invites";

export async function getInviteActivationView(token: string) {
  "use server";

  return getInviteActivationViewInRequest(token);
}

export async function acceptInvitePasswordStep(input: {
  token: string;
  password: string;
  confirmPassword?: string;
}) {
  "use server";

  return acceptInvitePasswordStepInRequest(input);
}
