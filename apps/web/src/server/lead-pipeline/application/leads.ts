import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { db } from "~/lib/db/db";
import type { LeadCallOutcome } from "~/lib/db/types";
import { toLeadStage, toLeadStatus, toPrioridad } from "~/lib/db/types";
import { getLeadDetailQuery } from "~/server/leads/application/get-lead-detail";
import { registerLeadUseCase } from "~/server/leads/application/register-lead";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { pipelineAuditService } from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { resolveLeadAvailableActions } from "../domain/lead";
import {
  describeLeadCallOutcome,
  formatLeadActorName,
} from "../domain/lead-interaction";
import { createLeadPipelineRepos } from "../infrastructure/repos";

export type LeadTimelineItem = {
  id: string;
  occurredAt: number;
  kind: "call" | "note" | "assignment" | "stage-change" | "system";
  title: string;
  description: string;
  actorDisplayName: string;
};

type LegacyLeadDetailValue =
  Awaited<ReturnType<typeof getLeadDetailQuery>> extends Result<
    infer TValue,
    DomainError
  >
    ? TValue extends {
        lead: unknown;
        commercialInput: unknown;
        quotations: unknown;
      }
      ? TValue
      : never
    : never;

export type LeadDetailOutput = {
  lead: LegacyLeadDetailValue["lead"];
  commercialInput: LegacyLeadDetailValue["commercialInput"];
  quotations: LegacyLeadDetailValue["quotations"];
  sale: Awaited<
    ReturnType<
      ReturnType<typeof createLeadPipelineRepos>["sales"]["findByLead"]
    >
  >;
  timeline: LeadTimelineItem[];
  availableActions: ReturnType<typeof resolveLeadAvailableActions>;
};

function canRevealFullHistory(role: Role) {
  return role === "sales_manager" || role === "admin" || role === "superuser";
}

function parseAuditChanges(changes: string | null) {
  if (!changes) {
    return null;
  }

  try {
    return JSON.parse(changes) as Record<string, unknown>;
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
    case "status_changed":
      return {
        kind: "system" as const,
        title: "Estado actualizado",
        description:
          typeof payload?.to === "string"
            ? `Nuevo estado: ${payload.to}.`
            : `Actualizado por ${input.actorDisplayName}.`,
      };
    case "prioridad_changed":
      return {
        kind: "system" as const,
        title: "Prioridad actualizada",
        description:
          typeof payload?.to === "string"
            ? `Nueva prioridad: ${payload.to}.`
            : `Actualizado por ${input.actorDisplayName}.`,
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

export async function createLead(input: {
  actorUserId: number;
  actorRole: Role;
  executiveId: number;
  ruc: string;
}): Promise<Result<{ leadId: number }, DomainError>> {
  if (!input.ruc.trim()) {
    return Err(domainError("validation", "invalid_ruc", "RUC is required"));
  }

  const result = await registerLeadUseCase({
    ruc: input.ruc.trim(),
    executiveId: input.executiveId,
    actorId: input.actorUserId,
  });

  if (result.ok) {
    return Ok({ leadId: result.value.id });
  }

  return result;
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
  const scopedRepos = createLeadPipelineRepos(db);
  const canViewAll = hasPermission(input.actorRole, "lead:view:all");
  const filters = {
    executiveId: canViewAll ? input.filters.executiveId : input.actorUserId,
    stage: toLeadStage(input.filters.stage),
    status: toLeadStatus(input.filters.status),
    prioridad: toPrioridad(input.filters.prioridad),
    limit: Math.min(input.filters.limit ?? 50, 200),
    offset: input.filters.offset ?? 0,
  };

  const [rows, totalCount] = await Promise.all([
    scopedRepos.leads.list(filters),
    scopedRepos.leads.count(filters),
  ]);

  return Ok({ rows, totalCount });
}

export async function getLeadDetail(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
}): Promise<Result<LeadDetailOutput, DomainError>> {
  const detailResult = await getLeadDetailQuery({
    leadId: input.leadId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
  });

  if (!detailResult.ok) {
    return detailResult;
  }

  const repos = createLeadPipelineRepos(db);
  const revealFullHistory = canRevealFullHistory(input.actorRole);

  const [sale, interactions, assignmentEvents, auditEvents] = await Promise.all(
    [
      repos.sales.findByLead(input.leadId),
      repos.leadInteractions.listByLeadId(input.leadId),
      repos.leadHistory.listAssignments(input.leadId),
      repos.leadHistory.listAuditEvents(input.leadId),
    ],
  );

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

    if (interaction.kind === "call") {
      timeline.push({
        id: `interaction:${interaction.id}`,
        occurredAt: interaction.created_at,
        kind: "call",
        title: describeLeadCallOutcome(interaction.outcome),
        description:
          interaction.body_text?.trim() ||
          `Registrada por ${actorDisplayName}.`,
        actorDisplayName,
      });
      continue;
    }

    timeline.push({
      id: `interaction:${interaction.id}`,
      occurredAt: interaction.created_at,
      kind: "note",
      title: "Nota registrada",
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

  timeline.sort((a, b) => b.occurredAt - a.occurredAt);

  return Ok({
    ...detailResult.value,
    sale,
    timeline,
    availableActions: resolveLeadAvailableActions({
      stage: detailResult.value.lead.stage,
      canLogTimeline: hasPermission(input.actorRole, "lead:pipeline"),
      canCompleteCommercialInput: hasPermission(
        input.actorRole,
        "lead:register",
      ),
      canCreateSale: hasPermission(input.actorRole, "lead:register"),
    }),
  });
}

export async function logLeadInteraction(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
  kind: "call" | "note";
  outcome?: LeadCallOutcome;
  bodyText?: string | null;
}): Promise<Result<{ interactionId: number }, DomainError>> {
  const detailResult = await getLeadDetailQuery({
    leadId: input.leadId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
  });

  if (!detailResult.ok) {
    return detailResult;
  }

  const bodyText = input.bodyText?.trim() ?? null;
  if (input.kind === "call" && !input.outcome) {
    return Err(
      domainError(
        "validation",
        "call_outcome_required",
        "Call outcome is required",
      ),
    );
  }
  if (input.kind === "note" && !bodyText) {
    return Err(
      domainError("validation", "note_required", "Note body is required"),
    );
  }

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createLeadPipelineRepos(executor);
    const interactionId = await repos.leadInteractions.insert({
      lead_id: input.leadId,
      kind: input.kind,
      outcome: input.kind === "call" ? (input.outcome ?? null) : null,
      body_text: bodyText,
      created_by: input.actorUserId,
      created_at: Date.now(),
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorUserId,
        "lead_interaction_logged",
        "lead",
        input.leadId,
        {
          interactionId,
          kind: input.kind,
        },
      );
    });

    return Ok({ interactionId });
  });
}

export async function getSourcingPolicy(input: {
  actorRole: Role;
  branchId: number;
}) {
  if (!hasPermission(input.actorRole, "capacity:policy:manage")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const repos = createLeadPipelineRepos(db);
  const current = await repos.sourcingPolicies.findByBranchId(input.branchId);

  return Ok({
    branchId: input.branchId,
    engineAssignmentEnabled: current?.engine_assignment_enabled === 1,
  });
}

export async function updateSourcingPolicy(input: {
  actorUserId: number;
  actorRole: Role;
  branchId: number;
  engineAssignmentEnabled: boolean;
}) {
  if (!hasPermission(input.actorRole, "capacity:policy:manage")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return runInPipelineTransaction(async ({ executor }) => {
    const repos = createLeadPipelineRepos(executor);
    await repos.sourcingPolicies.upsert({
      branch_id: input.branchId,
      engine_assignment_enabled: input.engineAssignmentEnabled ? 1 : 0,
      updated_at: Date.now(),
      updated_by_user_id: input.actorUserId,
    });

    return Ok({
      branchId: input.branchId,
      engineAssignmentEnabled: input.engineAssignmentEnabled,
    });
  });
}
