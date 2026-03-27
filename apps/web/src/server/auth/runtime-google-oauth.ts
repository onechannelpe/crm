import { authRepos, privilegedLoginAlertSender } from "./repos";

export function getGoogleOAuthCallbackRuntime() {
  return {
    repos: authRepos,
    privilegedLoginAlertSender,
  };
}
