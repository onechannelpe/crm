import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import {
  parseDigitalPolicy,
  toDigitalPolicyFields,
  validateDigitalAggregate,
} from "~/server/workflow/lead/domain/digital-policy";
import type { SaveDigitalPolicyCommandInput } from "~/server/workflow/types";

import { authorizeLeadAction } from "../../lead/domain/policy";
import { runLeadTransaction } from "./transition";

export async function saveDigitalPolicyCommand(
  input: SaveDigitalPolicyCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leadStates.findById(input.leadId);
    if (!state) return Err(fail("lead_not_found"));

    const authz = authorizeLeadAction(
      "edit-commercial-scope",
      input.actor,
      state,
    );
    if (!authz.ok) return authz;
    if (state.stage !== "SETUP") {
      return Err(fail("invalid_digital_policy_stage"));
    }

    const policy = parseDigitalPolicy({
      linkScope: input.linkScope,
      linkUrl: input.linkUrl,
      onlineScope: input.onlineScope,
      onlineUrl: input.onlineUrl,
      onlineCollectionMode: input.onlineCollectionMode,
    });
    if (!policy.ok) return policy;

    const venues = await ctx.repos.leadVenues.listByLeadId(state.id);
    if (!venues.ok) return venues;

    const aggregateCheck = validateDigitalAggregate({
      policy: policy.value,
      venues: venues.value,
    });
    if (!aggregateCheck.ok) return aggregateCheck;

    await ctx.repos.digitalPolicies.upsert({
      leadId: state.id,
      fields: toDigitalPolicyFields(policy.value),
      updatedAt: ctx.now,
      updatedBy: input.actor.userId,
    });

    return Ok({ leadId: state.id });
  });
}
