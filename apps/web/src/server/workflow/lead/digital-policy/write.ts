import type { SaveDigitalPolicyInput } from "~/contracts/workflow/inputs";
import { fail, type DomainError } from "~/domain/errors";
import type { WorkflowLeadId } from "~/domain/ids";
import type { WorkflowActor } from "~/server/workflow/actor";
import {
  parseDigitalPolicy,
  toDigitalPolicyFields,
  validateDigitalAggregate,
} from "~/server/workflow/lead/digital-policy/domain";
import type { WorkflowWriteContext } from "~/server/workflow/types";
import { Err, Ok, type Result } from "~/shared/result";

import { authorizeLeadAction } from "../../lead/domain/policy";
import { runLeadTransaction } from "../write/transition";

export async function saveDigitalPolicyCommand(
  input: Omit<SaveDigitalPolicyInput, "leadId"> & {
    actor: WorkflowActor;
    leadId: WorkflowLeadId;
  },
  scope: WorkflowWriteContext,
): Promise<Result<{ leadId: string }, DomainError>> {
  return runLeadTransaction(scope, async (ctx) => {
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
      updatedAt: ctx.operationAt,
      updatedBy: input.actor.userId,
    });

    return Ok({ leadId: state.id });
  });
}
