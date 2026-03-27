import { privilegedLoginAlertSender, repos } from "~/server/shared/context";

export function getGoogleOAuthCallbackRuntime() {
  return {
    repos,
    privilegedLoginAlertSender,
  };
}
