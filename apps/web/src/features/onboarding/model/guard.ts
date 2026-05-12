import type { Facts } from "./state";

export function canShowSecurityChoice(facts: Facts): boolean {
  return (
    facts.hasPhone &&
    facts.requirements.requiredActions.includes("configure_strong_auth")
  );
}

export function canShowTotpOrPasskey(facts: Facts): boolean {
  return canShowSecurityChoice(facts);
}

export function canCompleteWithoutSecurity(facts: Facts): boolean {
  return (
    facts.hasPhone &&
    !facts.requirements.requiredActions.includes("configure_strong_auth")
  );
}
