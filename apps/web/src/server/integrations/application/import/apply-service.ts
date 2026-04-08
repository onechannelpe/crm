import { db } from "~/lib/db/db";
import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import { createHistoryEvent } from "~/server/pipeline/domain/history";
import { resolveReviewTransition } from "~/server/pipeline/domain/workflow";

import { enqueueOutboxEvents } from "./outbox-repo";
import { stageImportRows } from "./staging-repo";
import type {
  ImportRowInput,
  LoadedLead,
  OutboxEvent,
  RowResult,
} from "./types";

function resultSort(a: RowResult, b: RowResult): number {
  return a.row - b.row;
}

function nextStageFor(
  current: LoadedLead,
  nextStatus: LeadStatus | null,
  nextPrioridad: LeadPriority | null,
): LeadStage {
  if (nextStatus === null || nextPrioridad === null) {
    return current.stage;
  }
  return resolveReviewTransition({
    lead: {
      id: current.id,
      ruc: current.ruc,
      razonSocial: null,
      address: null,
      executiveId: current.executive_id,
      stage: "PENDING_EXTERNAL_REVIEW",
      status: current.status,
      prioridad: current.prioridad,
      engineCompanyName: null,
      engineAddress: null,
      engineFetchedAt: null,
      createdAt: 0,
      updatedAt: 0,
    },
    status: nextStatus,
    prioridad: nextPrioridad,
  });
}

export async function applyImportRows(input: {
  jobId: number;
  actorId: number;
  validRows: ImportRowInput[];
  invalidRows: Array<{
    row: number;
    reason: string;
    type: "import_status" | "import_prioridad";
  }>;
}): Promise<{ results: RowResult[]; applied: number; failed: number }> {
  const now = Date.now();
  const results: RowResult[] = input.invalidRows.map((row) => ({
    row: row.row,
    ok: false,
    reason: row.reason,
  }));

  const rucs = input.validRows.map((row) => row.ruc);
  const leads = await db
    .selectFrom("pipeline_leads")
    .select(["id", "ruc", "executive_id", "status", "prioridad", "stage"])
    .where("ruc", "in", rucs)
    .execute();
  const leadByRuc = new Map(
    leads.map((lead) => [lead.ruc, lead as LoadedLead]),
  );

  const execIds = Array.from(
    new Set(leads.map((lead) => lead.executive_id).filter((id) => id > 0)),
  );
  const execBranchRows =
    execIds.length > 0
      ? await db
          .selectFrom("users")
          .select(["id", "branch_id"])
          .where("id", "in", execIds)
          .execute()
      : [];
  const branchByExecutive = new Map(
    execBranchRows.map((row) => [row.id, row.branch_id]),
  );

  const sortedRows = [...input.validRows].sort((a, b) => a.row - b.row);
  let applied = 0;
  const outboxEvents: OutboxEvent[] = [];

  await db.transaction().execute(async (trx) => {
    await stageImportRows(trx, input.jobId, sortedRows, input.invalidRows, now);

    for (const row of sortedRows) {
      const lead = leadByRuc.get(row.ruc);
      if (!lead) {
        results.push({ row: row.row, ok: false, reason: "RUC not found" });
        await trx
          .updateTable("pipeline_integration_import_rows")
          .set({
            state: "failed",
            failure_reason: "RUC not found",
            lead_id: null,
            applied_at: Date.now(),
          })
          .where("integration_job_id", "=", input.jobId)
          .where("row_number", "=", row.row)
          .execute();
        continue;
      }

      if (lead.stage !== "PENDING_EXTERNAL_REVIEW") {
        const reason = "Lead is not in pending external review stage";
        results.push({ row: row.row, ok: false, reason });
        await trx
          .updateTable("pipeline_integration_import_rows")
          .set({
            state: "failed",
            failure_reason: reason,
            lead_id: lead.id,
            applied_at: Date.now(),
          })
          .where("integration_job_id", "=", input.jobId)
          .where("row_number", "=", row.row)
          .execute();
        continue;
      }

      const nextStatus =
        row.type === "import_status" ? row.status : lead.status;
      const nextPrioridad =
        row.type === "import_prioridad" ? row.prioridad : lead.prioridad;
      const nextStage = nextStageFor(lead, nextStatus, nextPrioridad);
      const stageChanged = nextStage !== lead.stage;
      const changedAt = Date.now();

      await trx
        .updateTable("pipeline_leads")
        .set({
          status: nextStatus,
          prioridad: nextPrioridad,
          stage: nextStage,
          updated_at: changedAt,
        })
        .where("id", "=", lead.id)
        .execute();

      const primaryHistory = createHistoryEvent({
        leadId: lead.id,
        eventType:
          row.type === "import_status"
            ? "lead_status_updated"
            : "lead_priority_updated",
        actorUserId: input.actorId,
        payload:
          row.type === "import_status"
            ? {
                fromStatus: lead.status,
                toStatus: row.status,
                reason: "Imported from CSV",
              }
            : {
                fromPrioridad: lead.prioridad,
                toPrioridad: row.prioridad,
                reason: "Imported from CSV",
              },
        occurredAt: changedAt,
      });
      await trx
        .insertInto("pipeline_history_events")
        .values({
          lead_id: primaryHistory.leadId,
          event_type: primaryHistory.eventType,
          actor_user_id: primaryHistory.actorUserId,
          subject_user_id: primaryHistory.subjectUserId,
          payload_json: primaryHistory.payload
            ? JSON.stringify(primaryHistory.payload)
            : null,
          occurred_at: primaryHistory.occurredAt,
        })
        .execute();

      await trx
        .insertInto("audit_logs")
        .values({
          user_id: input.actorId,
          action:
            row.type === "import_status"
              ? "lead_status_imported"
              : "lead_priority_imported",
          entity_type: "lead",
          entity_id: lead.id,
          changes: JSON.stringify({
            fromStatus: lead.status,
            toStatus: nextStatus,
            fromPrioridad: lead.prioridad,
            toPrioridad: nextPrioridad,
            fromStage: lead.stage,
            toStage: nextStage,
            reason: "Imported from CSV",
          }),
          created_at: changedAt,
        })
        .execute();

      if (stageChanged) {
        if (nextStatus === null || nextPrioridad === null) {
          throw new Error("Stage transition requires status and prioridad");
        }
        const reviewedHistory = createHistoryEvent({
          leadId: lead.id,
          eventType: "lead_reviewed",
          actorUserId: input.actorId,
          payload: {
            status: nextStatus,
            prioridad: nextPrioridad,
            reason: "Imported from CSV",
            fromStage: lead.stage,
            toStage: nextStage,
          },
          occurredAt: changedAt,
        });
        const stageHistory = createHistoryEvent({
          leadId: lead.id,
          eventType: "workflow_stage_changed",
          actorUserId: input.actorId,
          payload: {
            from: lead.stage,
            to: nextStage,
          },
          occurredAt: changedAt,
        });
        await trx
          .insertInto("pipeline_history_events")
          .values([
            {
              lead_id: reviewedHistory.leadId,
              event_type: reviewedHistory.eventType,
              actor_user_id: reviewedHistory.actorUserId,
              subject_user_id: reviewedHistory.subjectUserId,
              payload_json: reviewedHistory.payload
                ? JSON.stringify(reviewedHistory.payload)
                : null,
              occurred_at: reviewedHistory.occurredAt,
            },
            {
              lead_id: stageHistory.leadId,
              event_type: stageHistory.eventType,
              actor_user_id: stageHistory.actorUserId,
              subject_user_id: stageHistory.subjectUserId,
              payload_json: stageHistory.payload
                ? JSON.stringify(stageHistory.payload)
                : null,
              occurred_at: stageHistory.occurredAt,
            },
          ])
          .execute();

        await trx
          .insertInto("audit_logs")
          .values({
            user_id: input.actorId,
            action: "lead_reviewed",
            entity_type: "lead",
            entity_id: lead.id,
            changes: JSON.stringify({
              fromStage: lead.stage,
              toStage: nextStage,
              fromStatus: lead.status,
              toStatus: nextStatus,
              fromPrioridad: lead.prioridad,
              toPrioridad: nextPrioridad,
              reason: "Imported from CSV",
            }),
            created_at: changedAt,
          })
          .execute();

        if (nextStage === "NEEDS_EXECUTIVE_INPUT" && lead.executive_id > 0) {
          outboxEvents.push({
            topic: "lead.needs_executive_input",
            leadId: lead.id,
            ruc: lead.ruc,
            executiveId: lead.executive_id,
          });
        } else if (nextStage === "READY_FOR_QUOTATION") {
          const branchId = branchByExecutive.get(lead.executive_id) ?? 0;
          if (branchId > 0) {
            outboxEvents.push({
              topic: "lead.ready_for_quotation",
              leadId: lead.id,
              ruc: lead.ruc,
              branchId,
            });
          }
        }
      }

      await trx
        .updateTable("pipeline_integration_import_rows")
        .set({
          state: "applied",
          failure_reason: null,
          lead_id: lead.id,
          applied_at: changedAt,
        })
        .where("integration_job_id", "=", input.jobId)
        .where("row_number", "=", row.row)
        .execute();

      leadByRuc.set(lead.ruc, {
        ...lead,
        status: nextStatus,
        prioridad: nextPrioridad,
        stage: nextStage,
      });
      results.push({ row: row.row, ok: true });
      applied++;
    }
    await enqueueOutboxEvents(trx, outboxEvents, Date.now());
  });

  results.sort(resultSort);
  return {
    results,
    applied,
    failed: results.filter((row) => !row.ok).length,
  };
}
