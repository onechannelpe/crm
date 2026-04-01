import {
  hasPermission,
  type Permission,
  type Role,
} from "~/lib/auth/access/rbac";
import { db } from "~/lib/db/db";
import type { LeadCallOutcome, LeadStatus, Prioridad } from "~/lib/db/types";
import { toLeadStage, toLeadStatus, toPrioridad } from "~/lib/db/types";
import { isPlainRecord } from "~/lib/type-guards";
import { engineClient } from "~/server/shared/composition-root";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import {
  pipelineAuditService,
  pipelineNotificationCenter,
} from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  buildLeadDraft,
  ensureLeadCanApproveForSale,
  ensureLeadCanCompleteCommercialInput,
  ensureLeadCanCreateQuotation,
  ensureLeadCanCreateSale,
  ensureLeadCanReassign,
  resolveLeadAvailableActions,
  resolveReviewStage,
} from "../domain/lead";
import type { LeadDomainEvent } from "../domain/lead-event";
import {
  describeLeadCallOutcome,
  formatLeadActorName,
} from "../domain/lead-interaction";
import { createLeadPipelineRepos } from "../infrastructure/repos";
import { dispatchLeadNotifications } from "./notifications";

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
type SaleRow = NonNullable<
  Awaited<
    ReturnType<ReturnType<typeof createLeadPipelineRepos>["sales"]["findById"]>
  >
>;

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

function buildReviewNotifications(input: {
  lead: LeadRow;
  branchId: number;
  nextStage: LeadRow["stage"];
}): LeadDomainEvent[] {
  if (input.nextStage === "NEEDS_EXECUTIVE_INPUT") {
    return [
      {
        type: "lead_needs_executive_input",
        leadId: input.lead.id,
        executiveId: input.lead.executive_id,
        ruc: input.lead.ruc,
      },
    ];
  }

  if (input.nextStage === "READY_FOR_QUOTATION") {
    return [
      {
        type: "lead_ready_for_quotation",
        leadId: input.lead.id,
        branchId: input.branchId,
        ruc: input.lead.ruc,
      },
    ];
  }

  return [];
}

export async function createLead(input: {
  actorUserId: number;
  actorRole: Role;
  executiveId: number;
  ruc: string;
}): Promise<Result<{ leadId: number }, DomainError>> {
  const ruc = input.ruc.trim();
  if (!ruc) {
    return Err(domainError("validation", "invalid_ruc", "RUC is required"));
  }

  const enrichment = await engineClient.search("ruc", ruc, 1);
  const searchResult = enrichment.ok
    ? (enrichment.value.find((candidate) => candidate.org?.ruc === ruc) ??
      enrichment.value[0] ??
      null)
    : null;

  const now = Date.now();
  const leadDraft = buildLeadDraft({
    ruc,
    razonSocial: searchResult?.org?.name ?? null,
    address: searchResult?.org?.fiscal_address ?? null,
    executiveId: input.executiveId,
    now,
  });
  if (!leadDraft.ok) {
    return leadDraft;
  }

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createLeadPipelineRepos(executor);
    const targetExecutive = await repos.users.findById(input.executiveId);
    if (!targetExecutive || !targetExecutive.is_active) {
      return Err(
        domainError(
          "validation",
          "invalid_executive",
          "Target executive not found or inactive",
        ),
      );
    }

    const existing = await repos.leads.findByRuc(ruc);
    if (existing) {
      const existingExecutive = await repos.users.findById(
        existing.executive_id,
      );
      const isReassignable =
        existing.stage !== "CONVERTED" &&
        (existingExecutive ? !existingExecutive.is_active : false);

      if (!isReassignable) {
        return Err(
          domainError(
            "conflict",
            "ruc_conflict",
            "A lead with this RUC already exists",
          ),
        );
      }

      const canReassign = ensureLeadCanReassign({
        currentExecutiveId: existing.executive_id,
        newExecutiveId: input.executiveId,
      });
      if (!canReassign.ok) {
        return canReassign;
      }

      await repos.leadAssignments.deactivateActiveForLead(existing.id);
      await repos.leadAssignments.insert({
        lead_id: existing.id,
        executive_id: input.executiveId,
        assigned_by: input.actorUserId,
        is_active: 1,
        assigned_at: now,
      });
      await repos.leads.updateById(existing.id, {
        executive_id: input.executiveId,
        updated_at: now,
      });

      afterCommit(async () => {
        await pipelineAuditService.log(
          input.actorUserId,
          "lead_reassigned",
          "lead",
          existing.id,
          {
            from: existing.executive_id,
            to: input.executiveId,
            reason: "inactive_previous_executive",
          },
        );
      });

      return Ok({ leadId: existing.id });
    }

    const leadId = await repos.leads.insert(leadDraft.value);
    await repos.leadAssignments.insert({
      lead_id: leadId,
      executive_id: input.executiveId,
      assigned_by: input.actorUserId,
      is_active: 1,
      assigned_at: now,
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorUserId,
        "lead_created",
        "lead",
        leadId,
        {
          ruc,
          stage: "PENDING_EXTERNAL_REVIEW",
        },
      );
    });

    return Ok({ leadId });
  });
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

export async function reviewLead(input: {
  actorUserId: number;
  actorRole: Role;
  branchId: number;
  leadId: number;
  status: LeadStatus;
  prioridad: Prioridad;
  reason: string;
}): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:review")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createLeadPipelineRepos(executor);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const nextStage = resolveReviewStage({
      currentStage: lead.stage,
      status: input.status,
      prioridad: input.prioridad,
    });
    if (!nextStage.ok) {
      return nextStage;
    }

    await repos.leads.updateById(input.leadId, {
      status: input.status,
      prioridad: input.prioridad,
      stage: nextStage.value,
      updated_at: Date.now(),
    });

    const notifications = buildReviewNotifications({
      lead,
      branchId: input.branchId,
      nextStage: nextStage.value,
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorUserId,
        "lead_reviewed",
        "lead",
        input.leadId,
        {
          fromStage: lead.stage,
          toStage: nextStage.value,
          fromStatus: lead.status,
          toStatus: input.status,
          fromPrioridad: lead.prioridad,
          toPrioridad: input.prioridad,
          reason: input.reason,
        },
      );
      await pipelineAuditService.log(
        input.actorUserId,
        "stage_changed",
        "lead",
        input.leadId,
        {
          from: lead.stage,
          to: nextStage.value,
        },
      );
    });

    if (notifications.length > 0) {
      afterCommit(() =>
        dispatchLeadNotifications(notifications, pipelineNotificationCenter),
      );
    }

    return Ok(undefined);
  });
}

export async function completeExecutiveInput(input: {
  actorUserId: number;
  actorRole: Role;
  branchId: number;
  leadId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
}): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:register")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createLeadPipelineRepos(executor);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const canComplete = ensureLeadCanCompleteCommercialInput({
      stage: lead.stage,
      executiveId: lead.executive_id,
      actorUserId: input.actorUserId,
    });
    if (!canComplete.ok) {
      return canComplete;
    }

    const now = Date.now();
    await repos.leadCommercialInputs.upsert({
      lead_id: input.leadId,
      proveedor_actual: input.proveedorActual,
      tasa_actual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      abono: input.abono,
      cantidad_pos: input.cantidadPos,
      updated_at: now,
      updated_by: input.actorUserId,
    });
    await repos.leads.updateById(input.leadId, {
      stage: "READY_FOR_QUOTATION",
      updated_at: now,
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorUserId,
        "stage_changed",
        "lead",
        input.leadId,
        {
          from: lead.stage,
          to: "READY_FOR_QUOTATION",
        },
      );
    });
    afterCommit(() =>
      dispatchLeadNotifications(
        [
          {
            type: "lead_ready_for_quotation",
            leadId: lead.id,
            branchId: input.branchId,
            ruc: lead.ruc,
          },
        ],
        pipelineNotificationCenter,
      ),
    );

    return Ok(undefined);
  });
}

export async function createQuotation(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: "PEN" | "USD";
}): Promise<Result<{ id: number }, DomainError>> {
  if (!hasPermission(input.actorRole, "quotation:manage")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createLeadPipelineRepos(executor);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const canCreate = ensureLeadCanCreateQuotation(lead.stage);
    if (!canCreate.ok) {
      return canCreate;
    }

    const version = await repos.quotations.nextVersion(input.leadId);
    const quotationId = await repos.quotations.insert({
      lead_id: input.leadId,
      payback_pricing: input.paybackPricing,
      tarifa_debito: input.tarifaDebito,
      tarifa_credito: input.tarifaCredito,
      tarifa_foraneo: input.tarifaForaneo,
      fee: input.fee,
      moneda: input.moneda,
      version,
      created_at: Date.now(),
      created_by: input.actorUserId,
    });

    await repos.leads.updateById(input.leadId, {
      stage: "QUOTED",
      updated_at: Date.now(),
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorUserId,
        "quotation_created",
        "lead",
        input.leadId,
        {
          quotationId,
          version,
          to: "QUOTED",
        },
      );
    });

    return Ok({ id: quotationId });
  });
}

export async function approveLeadForSale(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
}): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "quotation:manage")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createLeadPipelineRepos(executor);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const canApprove = ensureLeadCanApproveForSale(lead.stage);
    if (!canApprove.ok) {
      return canApprove;
    }

    await repos.leads.updateById(input.leadId, {
      stage: "READY_FOR_SALE",
      updated_at: Date.now(),
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorUserId,
        "stage_changed",
        "lead",
        input.leadId,
        {
          from: lead.stage,
          to: "READY_FOR_SALE",
        },
      );
    });
    afterCommit(() =>
      dispatchLeadNotifications(
        [
          {
            type: "lead_ready_for_sale",
            leadId: lead.id,
            executiveId: lead.executive_id,
            ruc: lead.ruc,
          },
        ],
        pipelineNotificationCenter,
      ),
    );

    return Ok(undefined);
  });
}

export async function createSale(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  banco: string;
  nroCuenta: string;
  cci: string | null;
}): Promise<Result<{ id: number }, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:register")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createLeadPipelineRepos(executor);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const canCreate = ensureLeadCanCreateSale({
      stage: lead.stage,
      executiveId: lead.executive_id,
      actorUserId: input.actorUserId,
      banco: input.banco,
      cci: input.cci,
    });
    if (!canCreate.ok) {
      return canCreate;
    }

    const saleId = await repos.sales.insert({
      lead_id: input.leadId,
      executive_id: input.actorUserId,
      proveedor_actual: input.proveedorActual,
      tasa_actual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      abono: input.abono,
      cantidad_pos: input.cantidadPos,
      banco: input.banco,
      nro_cuenta: input.nroCuenta,
      cci: input.cci,
      created_at: Date.now(),
    });

    await repos.leads.updateById(input.leadId, {
      stage: "CONVERTED",
      updated_at: Date.now(),
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorUserId,
        "sale_created",
        "lead",
        input.leadId,
        {
          saleId,
          to: "CONVERTED",
        },
      );
    });

    return Ok({ id: saleId });
  });
}

export async function reassignLead(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
  newExecutiveId: number;
}): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:reassign")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createLeadPipelineRepos(executor);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const canReassign = ensureLeadCanReassign({
      currentExecutiveId: lead.executive_id,
      newExecutiveId: input.newExecutiveId,
    });
    if (!canReassign.ok) {
      return canReassign;
    }

    const newExecutive = await repos.users.findById(input.newExecutiveId);
    if (!newExecutive || !newExecutive.is_active) {
      return Err(
        domainError(
          "validation",
          "invalid_executive",
          "Target executive not found or inactive",
        ),
      );
    }

    const now = Date.now();
    await repos.leadAssignments.deactivateActiveForLead(input.leadId);
    await repos.leadAssignments.insert({
      lead_id: input.leadId,
      executive_id: input.newExecutiveId,
      assigned_by: input.actorUserId,
      is_active: 1,
      assigned_at: now,
    });
    await repos.leads.updateById(input.leadId, {
      executive_id: input.newExecutiveId,
      updated_at: now,
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorUserId,
        "lead_reassigned",
        "lead",
        input.leadId,
        {
          from: lead.executive_id,
          to: input.newExecutiveId,
        },
      );
    });

    return Ok(undefined);
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
  const detail = await getLeadDetail({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    leadId: input.leadId,
  });
  if (!detail.ok) {
    return detail;
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

export async function listSales(input: {
  actorRole: Role;
  actorUserId: number;
  limit?: number;
  offset?: number;
}): Promise<Result<SaleRow[], DomainError>> {
  if (!hasPermission(input.actorRole, "lead:register")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const repos = createLeadPipelineRepos(db);
  const limit = Math.min(input.limit ?? 50, 200);
  const offset = input.offset ?? 0;

  if (input.actorRole === "executive") {
    return Ok(
      await repos.sales.listByExecutive(input.actorUserId, limit, offset),
    );
  }

  return Ok(await repos.sales.list(limit, offset));
}

export async function getSaleDetail(input: {
  actorRole: Role;
  actorUserId: number;
  saleId: number;
}): Promise<Result<SaleRow, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:register")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const repos = createLeadPipelineRepos(db);
  const sale = await repos.sales.findById(input.saleId);
  if (!sale) {
    return Err(domainError("not_found", "sale_not_found", "Sale not found"));
  }

  const canViewAll = input.actorRole !== "executive";
  if (!canViewAll && sale.executive_id !== input.actorUserId) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return Ok(sale);
}
