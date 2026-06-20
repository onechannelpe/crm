import type { SaveDigitalPolicyInput } from "~/contracts/workflow/inputs";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { WorkflowActor } from "~/server/workflow/actor";
import {
  parseDigitalPolicy,
  toDigitalPolicyFields,
  validateDigitalAggregate,
} from "~/server/workflow/lead/digital-policy/domain";

import { authorizeLeadAction } from "../../lead/domain/policy";
import { runLeadTransaction } from "../write/transition";

export async function saveDigitalPolicyCommand(
  input: SaveDigitalPolicyInput & {
    actor: WorkflowActor;
  },
  ports: {
    executor: DatabaseExecutor;
    now: number;
  },
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(ports, async (ctx) => {
    const state = await ctx.repos.leads.findById(input.leadId);

    if (!state) {
      return Err(fail("lead_not_found"));
    }

    const authz = authorizeLeadAction(
      "edit-commercial-scope",
      input.actor,
      state,
    );

    if (!authz.ok) {
      return authz;
    }

    if (state.stage !== "SETUP") {
      return Err(fail("invalid_digital_policy_stage"));
    }

    const parsedPolicy = parseDigitalPolicy({
      linkScope: input.linkScope,
      linkUrl: input.linkUrl,
      onlineScope: input.onlineScope,
      onlineUrl: input.onlineUrl,
      onlineCollectionMode: input.onlineCollectionMode,
    });

    if (!parsedPolicy.ok) {
      return parsedPolicy;
    }

    const venueList = await ctx.repos.leadVenues.listByLeadId(state.id);

    if (!venueList.ok) {
      return venueList;
    }

    const aggregateCheck = validateDigitalAggregate({
      policy: parsedPolicy.value,
      venues: venueList.value,
    });

    if (!aggregateCheck.ok) {
      return aggregateCheck;
    }

    await ctx.repos.digitalPolicies.upsert({
      leadId: state.id,
      fields: toDigitalPolicyFields(parsedPolicy.value),
      updatedAt: ctx.now,
      updatedBy: input.actor.userId,
    });

    return Ok({ leadId: state.id });
  });
}
