import { privilegedLoginAlertSender, repos } from "~/server/shared/context";

export function createAuthLoginContext() {
  return {
    repos,
    privilegedLoginAlertSender,
  };
}

export type AuthLoginContext = ReturnType<typeof createAuthLoginContext>;
