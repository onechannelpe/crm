import type { OnboardingRequirements } from "~/server/auth/policy/types";

import type { RequestedStep } from "../model/event";
import { resolveViewState } from "../model/transition";
import { deriveFacts } from "./fact";

export function buildView(input: {
  requirements: OnboardingRequirements;
  userPhone: string | null;
  requestedStep: RequestedStep;
}) {
  const facts = deriveFacts({
    requirements: input.requirements,
    userPhone: input.userPhone,
  });

  return resolveViewState(facts, input.requestedStep);
}
