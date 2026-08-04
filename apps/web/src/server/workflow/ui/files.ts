import "server-only";
import { WorkflowLeadId } from "~/domain/ids";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

export async function listLeadSaleProofFiles(leadId: string) {
  return executeSessionServerFunction({
    name: "application.workflow.list_sale_proof_files",
    access: { kind: "auth" },
    parse: () =>
      parseObject({ leadId }, validationFail, (reader) => ({
        leadId: reader.id("leadId", WorkflowLeadId),
      })),
    telemetry: (input) => ({ leadId: input.leadId }),
    execute: (context, input) =>
      application.workflow.files.listSaleProofFiles({
        ctx: context,
        leadId: input.leadId,
      }),
  });
}
