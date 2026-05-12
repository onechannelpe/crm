import type { OnboardingRequirements } from "~/server/auth/policy/types";

import type { RequestedStep } from "../model/event";
import { resolveViewState } from "../model/transition";
import { deriveFacts } from "./fact";

export function buildView(input: {
  requirements: OnboardingRequirements;
  userPhoneE164: string | null;
  phoneDraft: string | undefined;
  requestedStep: RequestedStep;
}) {
  const facts = deriveFacts({
    requirements: input.requirements,
    userPhoneE164: input.userPhoneE164,
    phoneDraft: input.phoneDraft,
  });
  const state = resolveViewState(facts, input.requestedStep);

  return {
    state,
    phoneDraft: facts.phoneDraft,
  };
}
