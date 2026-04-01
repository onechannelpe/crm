import { createAuthLoginContext } from "./infrastructure/login-context";

export function getGoogleOAuthCallbackRuntime() {
  const deps = createAuthLoginContext();
  return {
    repos: deps.repos,
    privilegedLoginAlertSender: deps.privilegedLoginAlertSender,
  };
}
