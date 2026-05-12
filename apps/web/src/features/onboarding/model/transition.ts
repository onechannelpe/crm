import type { RequestedStep } from "./event";
import {
  canCompleteWithoutSecurity,
  canShowSecurityChoice,
  canShowTotpOrPasskey,
} from "./guard";
import type { Facts, ViewState } from "./state";

export function resolveViewState(
  facts: Facts,
  requestedStep: RequestedStep,
): ViewState {
  if (facts.requirements.canAccessApp) {
    return {
      step: "done",
      securityRequired: false,
      canFinishWithoutSecurity: false,
    };
  }

  if (!facts.hasPhone) {
    return {
      step: "profile",
      securityRequired: false,
      canFinishWithoutSecurity: false,
    };
  }

  const securityRequired = facts.requirements.requiredActions.includes(
    "configure_strong_auth",
  );
  const canFinishWithoutSecurity = canCompleteWithoutSecurity(facts);

  if (requestedStep === "pending-step") {
    return {
      step: "pending-step",
      securityRequired,
      canFinishWithoutSecurity,
    };
  }

  if (!securityRequired) {
    return {
      step: "security-choice",
      securityRequired: false,
      canFinishWithoutSecurity: true,
    };
  }

  if (!canShowSecurityChoice(facts)) {
    return {
      step: "profile",
      securityRequired: true,
      canFinishWithoutSecurity: false,
    };
  }

  if (
    (requestedStep === "totp-step" || requestedStep === "passkey-step") &&
    canShowTotpOrPasskey(facts)
  ) {
    return {
      step: requestedStep,
      securityRequired,
      canFinishWithoutSecurity,
    };
  }

  return {
    step: "security-choice",
    securityRequired,
    canFinishWithoutSecurity,
  };
}
