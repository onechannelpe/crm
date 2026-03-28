import { createAuthDeps } from "./infrastructure/deps";

export function getGoogleOAuthCallbackRuntime() {
  const deps = createAuthDeps();
  return {
    repos: deps.repos,
    privilegedLoginAlertSender: deps.privilegedLoginAlertSender,
  };
}
