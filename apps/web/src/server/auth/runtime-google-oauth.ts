import {
  authRepos,
  privilegedLoginAlertSender,
} from "./infrastructure/runtime";

export function getGoogleOAuthCallbackRuntime() {
  return {
    repos: authRepos,
    privilegedLoginAlertSender,
  };
}
