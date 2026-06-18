import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { SaveDigitalPolicyCommandInput } from "~/server/workflow/types";

import { authorizeLeadAction } from "../../domain/lead/policy";
import { createLeadStateRepo } from "../../infrastructure/lead-state-repo";
import { createWorkflowRepos } from "../../infrastructure/workflow-repos";
import {
  parseDigitalPolicy,
  toProfileDigitalFields,
  validateDigitalAggregate,
} from "../services/digital-product-policy";

export async function saveDigitalPolicyCommand(
  input: SaveDigitalPolicyCommandInput,
  ports: { executor: DatabaseExecutor; now: number },
): Promise<Result<{ leadId: string }, DomainError>> {
  return ports.executor.transaction().execute(async (tx) => {
    const repos = createWorkflowRepos(tx);
    const leads = createLeadStateRepo(tx);

    const state = await leads.findById(input.leadId);
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
      onlineModalidad: input.onlineModalidad,
    });
    if (!policy.ok) return policy;

    const venues = await repos.leadVenues.listByLeadId(state.id);
    if (!venues.ok) return venues;

    const aggregateCheck = validateDigitalAggregate({
      policy: policy.value,
      venues: venues.value,
    });
    if (!aggregateCheck.ok) return aggregateCheck;

    const profile = await repos.leadProfiles.findByLeadId(input.leadId);
    const digitalFields = toProfileDigitalFields(policy.value);
    const now = ports.now;

    await repos.leadProfiles.upsert({
      leadId: state.id,
      proveedorActual: profile?.proveedorActual ?? null,
      tasaDebitoActual: profile?.tasaDebitoActual ?? null,
      tasaCreditoActual: profile?.tasaCreditoActual ?? null,
      gpv: profile?.gpv ?? null,
      ticket: profile?.ticket ?? null,
      abonoBank: profile?.abonoBank ?? null,
      posTotal: profile?.posTotal ?? null,
      ...digitalFields,
      updatedAt: now,
      updatedBy: input.actor.userId,
    });

    return Ok({ leadId: state.id });
  });
}
