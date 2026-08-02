import { expectOk } from "@tests/support/_core/assertions";
import { actorBy } from "@tests/support/database/workflow-fixtures";
import { withMerchantDefaults } from "@tests/support/database/workflow-seed";
import { createWorkflowImporter } from "@tests/support/integration/workflow-import";
import {
  registerLeadPorts,
  workflowCommandPorts,
  workflowRepos,
} from "@tests/support/integration/workflow-ports";
import {
  createTestRuntime,
  type TestRuntime,
} from "@tests/support/runtime/app";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { WorkflowVenueId } from "~/domain/ids";
import { acceptRateCommand } from "~/server/workflow/lead/commands/accept-rate";
import { proposeRateCommand } from "~/server/workflow/lead/commands/propose-rate";
import { registerLead } from "~/server/workflow/lead/commands/register-lead";
import { saveDigitalPolicyCommand } from "~/server/workflow/lead/digital-policy/write";
import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";
import { addVenueAccountsCommand } from "~/server/workflow/lead/venue/add-venue-accounts";
import { createVenueCommand } from "~/server/workflow/lead/venue/create-venue";

describe("lead lifecycle journey", () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime("journey-lead-lifecycle");
  });

  afterAll(async () => {
    await runtime.dispose();
  });

  beforeEach(async () => {
    await runtime.reset();
    runtime.now.set(new Date(1_700_000_000_000));
  });

  it("moves a registered lead through pricing and setup into fulfillment", async () => {
    const executive = actorBy("execOne");
    const backOffice = actorBy("backOne");
    const ports = registerLeadPorts(runtime);
    const registered = expectOk(
      await registerLead(
        {
          actor: executive,
          ruc: "20987654321",
          lineOfBusiness: "Retail",
          ...withMerchantDefaults(undefined),
        },
        ports,
        { identity: ports.identity },
      ),
    );
    const lead = {
      id: registered.leadId,
      organization: { ruc: "20987654321" },
    };
    const importer = createWorkflowImporter({
      runtime,
    });

    await importer.run({
      actor: "backOne",
      rows: [
        { type: "status", lead, status: "DISPONIBLE" },
        { type: "priority", lead, priority: "P1" },
      ],
    });

    const proposal = expectOk(
      await proposeRateCommand(
        {
          actor: backOffice,
          leadId: lead.id,
          proposedDebitRate: 2.5,
          proposedCreditRate: 3,
          proposedForeignRate: 3.5,
          fee: 0.5,
          paybackPricing: 12,
          currency: "PEN",
        },
        workflowCommandPorts(runtime),
      ),
    );
    expectOk(
      await acceptRateCommand(
        {
          actor: executive,
          leadId: lead.id,
          proposalId: proposal.proposalId,
        },
        workflowCommandPorts(runtime),
      ),
    );
    expectOk(
      await saveDigitalPolicyCommand(
        {
          actor: executive,
          leadId: lead.id,
          linkScope: "none",
          linkUrl: null,
          onlineScope: "none",
          onlineUrl: null,
          onlineCollectionMode: null,
        },
        workflowCommandPorts(runtime),
      ),
    );
    expectOk(
      await createVenueCommand(
        {
          actor: executive,
          leadId: lead.id,
          tradeName: "Local principal",
          posQuantity: 1,
          address: "Av. Principal 100",
          addressReference: "Primer piso",
          district: "Lima",
          province: "Lima",
          department: "Lima",
        },
        workflowCommandPorts(runtime),
      ),
    );

    const setup = expectOk(
      await getLeadDetail(workflowRepos(runtime), {
        actorUserId: executive.userId,
        actorRole: executive.role,
        leadId: lead.id,
        evaluatedAt: runtime.now.get(),
      }),
    );
    expectOk(
      await addVenueAccountsCommand(
        {
          actor: executive,
          leadId: lead.id,
          venueId: WorkflowVenueId.trust(setup.venues[0].id),
          solesAccount: {
            currency: "PEN",
            banco: "BCP",
            tipoCuenta: "AHORROS",
            nroCuenta: "19100000000001",
            cci: "00219100000000000001",
            isSettlement: true,
          },
        },
        workflowCommandPorts(runtime),
      ),
    );

    const fulfillment = expectOk(
      await getLeadDetail(workflowRepos(runtime), {
        actorUserId: executive.userId,
        actorRole: executive.role,
        leadId: lead.id,
        evaluatedAt: runtime.now.get(),
      }),
    );
    expect(fulfillment.lead.stage).toBe("FULFILLMENT");
    expect(fulfillment.fulfillment?.currentStep).toBe("CHOOSE_PRODUCT");
  });
});
