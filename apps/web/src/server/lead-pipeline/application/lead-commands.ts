import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import type { LeadStatus, Prioridad } from "~/lib/db/types";
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
  ensureLeadCanCompleteCommercialInput,
  ensureLeadCanReassign,
  resolveReviewStage,
} from "../domain/lead";
import type { LeadDomainEvent } from "../domain/lead-event";
import { createLeadPipelineRepos } from "../infrastructure/repos";
import { dispatchLeadNotifications } from "./notifications";

type LeadRow = NonNullable<
  Awaited<
    ReturnType<ReturnType<typeof createLeadPipelineRepos>["leads"]["findById"]>
  >
>;

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
