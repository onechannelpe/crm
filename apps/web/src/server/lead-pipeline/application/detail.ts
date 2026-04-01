import {
  hasPermission,
  type Permission,
  type Role,
} from "~/lib/auth/access/rbac";
import { db } from "~/lib/db/db";
import { toLeadStage, toLeadStatus, toPrioridad } from "~/lib/db/types";
import { isPlainRecord } from "~/lib/type-guards";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { resolveLeadAvailableActions } from "../domain/lead";
import {
  describeLeadCallOutcome,
  formatLeadActorName,
} from "../domain/lead-interaction";
import { createLeadPipelineRepos } from "../infrastructure/repos";

type LeadRow = NonNullable<
  Awaited<
    ReturnType<ReturnType<typeof createLeadPipelineRepos>["leads"]["findById"]>
  >
>;
type CommercialInputRow = Awaited<
  ReturnType<
    ReturnType<
      typeof createLeadPipelineRepos
    >["leadCommercialInputs"]["findByLeadId"]
  >
>;
type QuotationRow = Awaited<
  ReturnType<
    ReturnType<typeof createLeadPipelineRepos>["quotations"]["listByLead"]
  >
>[number];

export type LeadTimelineItem = {
  id: string;
  occurredAt: number;
  kind: "call" | "note" | "assignment" | "stage-change" | "system";
  title: string;
  description: string;
  actorDisplayName: string;
};

export type LeadDetailOutput = {
  lead: LeadRow;
  commercialInput: CommercialInputRow;
  quotations: QuotationRow[];
  sale: Awaited<
    ReturnType<
      ReturnType<typeof createLeadPipelineRepos>["sales"]["findByLead"]
    >
  >;
  timeline: LeadTimelineItem[];
  availableActions: ReturnType<typeof resolveLeadAvailableActions>;
};

function canReadLead(role: Role) {
  const permissions: Permission[] = [
    "lead:pipeline",
    "lead:register",
    "lead:review",
    "quotation:manage",
    "lead:reassign",
  ];

  return permissions.some((permission) => hasPermission(role, permission));
}

function canViewAllLeads(role: Role) {
  return (
    hasPermission(role, "lead:view:all") ||
    hasPermission(role, "lead:review") ||
    hasPermission(role, "quotation:manage") ||
    hasPermission(role, "lead:reassign")
  );
}

function canRevealFullHistory(role: Role) {
  return role === "sales_manager" || role === "admin" || role === "superuser";
}

function parseAuditChanges(changes: string | null) {
  if (!changes) {
    return null;
  }

  try {
    const parsed = JSON.parse(changes) as unknown;
    return isPlainRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function describeAuditEvent(input: {
  action: string;
  changes: string | null;
  actorDisplayName: string;
}) {
  const payload = parseAuditChanges(input.changes);

  switch (input.action) {
    case "lead_created":
      return {
        kind: "system" as const,
        title: "Lead creado",
        description: `Registrado por ${input.actorDisplayName}.`,
      };
    case "stage_changed":
      return {
        kind: "stage-change" as const,
        title: "Etapa actualizada",
        description:
          typeof payload?.from === "string" && typeof payload?.to === "string"
            ? `${payload.from} -> ${payload.to}`
            : `Actualizado por ${input.actorDisplayName}.`,
      };
    case "quotation_created":
      return {
        kind: "system" as const,
        title: "Cotización creada",
        description:
          typeof payload?.quotationId === "number"
            ? `Cotización #${payload.quotationId} creada por ${input.actorDisplayName}.`
            : `Creada por ${input.actorDisplayName}.`,
      };
    case "sale_created":
      return {
        kind: "system" as const,
        title: "Venta creada",
        description:
          typeof payload?.saleId === "number"
            ? `Venta #${payload.saleId} creada por ${input.actorDisplayName}.`
            : `Creada por ${input.actorDisplayName}.`,
      };
    case "lead_reviewed":
      return {
        kind: "system" as const,
        title: "Lead revisado",
        description: `Revisado por ${input.actorDisplayName}.`,
      };
    case "lead_reassigned":
      return {
        kind: "assignment" as const,
        title: "Lead reasignado",
        description: `Reasignado por ${input.actorDisplayName}.`,
      };
    default:
      return null;
  }
}

export async function listLeads(input: {
  actorUserId: number;
  actorRole: Role;
  filters: {
    stage?: string;
    status?: string;
    prioridad?: string;
    executiveId?: number;
    limit?: number;
    offset?: number;
  };
}): Promise<
  Result<
    {
      rows: Awaited<
        ReturnType<ReturnType<typeof createLeadPipelineRepos>["leads"]["list"]>
      >;
      totalCount: number;
    },
    DomainError
  >
> {
  const repos = createLeadPipelineRepos(db);
  const filters = {
    executiveId: canViewAllLeads(input.actorRole)
      ? input.filters.executiveId
      : input.actorUserId,
    stage: toLeadStage(input.filters.stage),
    status: toLeadStatus(input.filters.status),
    prioridad: toPrioridad(input.filters.prioridad),
    limit: Math.min(input.filters.limit ?? 50, 200),
    offset: input.filters.offset ?? 0,
  };

  const [rows, totalCount] = await Promise.all([
    repos.leads.list(filters),
    repos.leads.count(filters),
  ]);

  return Ok({ rows, totalCount });
}

export async function getLeadDetail(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
}): Promise<Result<LeadDetailOutput, DomainError>> {
  if (!canReadLead(input.actorRole)) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const repos = createLeadPipelineRepos(db);
  const lead = await repos.leads.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  if (
    !canViewAllLeads(input.actorRole) &&
    lead.executive_id !== input.actorUserId
  ) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const revealFullHistory = canRevealFullHistory(input.actorRole);
  const [
    commercialInput,
    quotations,
    sale,
    interactions,
    assignmentEvents,
    auditEvents,
  ] = await Promise.all([
    repos.leadCommercialInputs.findByLeadId(input.leadId),
    repos.quotations.listByLead(input.leadId),
    repos.sales.findByLead(input.leadId),
    repos.leadInteractions.listByLeadId(input.leadId),
    repos.leadHistory.listAssignments(input.leadId),
    repos.leadHistory.listAuditEvents(input.leadId),
  ]);

  const timeline: LeadTimelineItem[] = [];

  for (const interaction of interactions) {
    const actorDisplayName = formatLeadActorName(
      {
        names: interaction.actor_names ?? "",
        first_surname: interaction.actor_first_surname ?? "",
        second_surname: interaction.actor_second_surname ?? "",
      },
      revealFullHistory,
    );

    timeline.push({
      id: `interaction:${interaction.id}`,
      occurredAt: interaction.created_at,
      kind: interaction.kind === "call" ? "call" : "note",
      title:
        interaction.kind === "call"
          ? describeLeadCallOutcome(interaction.outcome)
          : "Nota registrada",
      description:
        interaction.body_text?.trim() || `Registrada por ${actorDisplayName}.`,
      actorDisplayName,
    });
  }

  for (const assignment of assignmentEvents) {
    const actorDisplayName = formatLeadActorName(
      {
        names: assignment.actor_names ?? "",
        first_surname: assignment.actor_first_surname ?? "",
        second_surname: assignment.actor_second_surname ?? "",
      },
      revealFullHistory,
    );
    const executiveDisplayName = formatLeadActorName(
      {
        names: assignment.executive_names ?? "",
        first_surname: assignment.executive_first_surname ?? "",
        second_surname: assignment.executive_second_surname ?? "",
      },
      revealFullHistory,
    );

    timeline.push({
      id: `assignment:${assignment.id}`,
      occurredAt: assignment.assigned_at,
      kind: "assignment",
      title: assignment.is_active ? "Lead asignado" : "Asignación histórica",
      description: `${executiveDisplayName} asignado por ${actorDisplayName}.`,
      actorDisplayName,
    });
  }

  for (const auditEvent of auditEvents) {
    const actorDisplayName = formatLeadActorName(
      {
        names: auditEvent.actor_names ?? "",
        first_surname: auditEvent.actor_first_surname ?? "",
        second_surname: auditEvent.actor_second_surname ?? "",
      },
      revealFullHistory,
    );
    const event = describeAuditEvent({
      action: auditEvent.action,
      changes: auditEvent.changes,
      actorDisplayName,
    });

    if (!event) {
      continue;
    }

    timeline.push({
      id: `audit:${auditEvent.id}`,
      occurredAt: auditEvent.created_at,
      kind: event.kind,
      title: event.title,
      description: event.description,
      actorDisplayName,
    });
  }

  timeline.sort((left, right) => right.occurredAt - left.occurredAt);

  return Ok({
    lead,
    commercialInput,
    quotations,
    sale,
    timeline,
    availableActions: resolveLeadAvailableActions({
      stage: lead.stage,
      canLogTimeline: hasPermission(input.actorRole, "lead:pipeline"),
      canCompleteCommercialInput: hasPermission(
        input.actorRole,
        "lead:register",
      ),
      canCreateSale: hasPermission(input.actorRole, "lead:register"),
      canReviewLead: hasPermission(input.actorRole, "lead:review"),
      canCreateQuotation: hasPermission(input.actorRole, "quotation:manage"),
      canApproveForSale: hasPermission(input.actorRole, "quotation:manage"),
      canReassignLead: hasPermission(input.actorRole, "lead:reassign"),
    }),
  });
}
