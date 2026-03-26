import {
  hasPermission,
  type Permission,
  type Role,
} from "~/lib/auth/access/rbac";
import type { LeadCommercialInputRow } from "~/server/leads/infrastructure/lead-commercial-input-repo";
import type { LeadRow } from "~/server/leads/infrastructure/lead-repo";
import type { QuotationRow } from "~/server/quotations/infrastructure/quotation-repo";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { pipelineRepos } from "~/server/shared/pipeline-runtime";
import { type Result, Err, Ok } from "~/server/shared/result";

function canReadLead(role: Role): boolean {
  const permissions: Permission[] = [
    "lead:register",
    "lead:review",
    "quotation:manage",
    "lead:reassign",
  ];
  return permissions.some((permission) => hasPermission(role, permission));
}

export async function getLeadDetailQuery(input: {
  leadId: number;
  actorUserId: number;
  actorRole: Role;
}): Promise<
  Result<
    {
      lead: LeadRow;
      commercialInput: LeadCommercialInputRow | undefined;
      quotations: QuotationRow[];
    },
    DomainError
  >
> {
  if (!canReadLead(input.actorRole)) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const lead = await pipelineRepos.leads.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  const canViewAll =
    hasPermission(input.actorRole, "lead:view:all") ||
    hasPermission(input.actorRole, "lead:review") ||
    hasPermission(input.actorRole, "quotation:manage") ||
    hasPermission(input.actorRole, "lead:reassign");

  if (!canViewAll && lead.executive_id !== input.actorUserId) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const [commercialInput, quotations] = await Promise.all([
    pipelineRepos.leadCommercialInputs.findByLeadId(input.leadId),
    pipelineRepos.quotations.listByLead(input.leadId),
  ]);

  return Ok({ lead, commercialInput, quotations });
}
