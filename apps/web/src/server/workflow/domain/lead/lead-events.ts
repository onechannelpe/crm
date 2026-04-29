import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent, type LeadHistoryEventDraft } from "../history";
import type { LeadRecord } from "../lead-record";
import type { LeadMutationIntent, LeadMutationPatch } from "./lead-types";

type LeadAuditDraft = {
  action: string;
  entityId: string;
  changes?: Record<string, unknown>;
};

export type LeadMutationEvents = {
  history: LeadHistoryEventDraft[];
  audit: LeadAuditDraft;
};

export function deriveLeadMutationEvents(input: {
  lead: LeadRecord;
  intent: LeadMutationIntent;
  patch: LeadMutationPatch;
  actorUserId: number;
  now: number;
}): Result<LeadMutationEvents, DomainError> {
  const { lead, intent, patch, actorUserId, now } = input;

  if (intent.kind === "add_note") {
    return Ok({
      history: [
        createHistoryEvent({
          leadId: lead.id,
          eventType: "note_added",
          actorUserId,
          payload: { body: intent.body },
          occurredAt: now,
        }),
      ],
      audit: {
        action: "note_added",
        entityId: lead.id,
        changes: {},
      },
    });
  }

  if (intent.kind === "log_call") {
    return Ok({
      history: [
        createHistoryEvent({
          leadId: lead.id,
          eventType: "call_logged",
          actorUserId,
          payload: { outcome: intent.outcome, notes: intent.notes },
          occurredAt: now,
        }),
      ],
      audit: {
        action: "call_logged",
        entityId: lead.id,
        changes: { outcome: intent.outcome },
      },
    });
  }

  if (intent.kind === "reassign") {
    return Ok({
      history: [
        createHistoryEvent({
          leadId: lead.id,
          eventType: "lead_reassigned",
          actorUserId,
          subjectUserId: intent.toExecutiveId,
          payload: {
            fromExecutiveId: lead.executiveId,
            toExecutiveId: intent.toExecutiveId,
            ...(intent.reason ? { reason: intent.reason } : {}),
          },
          occurredAt: now,
        }),
      ],
      audit: {
        action: "lead_reassigned",
        entityId: lead.id,
        changes: {
          from: lead.executiveId,
          to: intent.toExecutiveId,
          ...(intent.reason ? { reason: intent.reason } : {}),
        },
      },
    });
  }

  if (intent.kind === "review") {
    return Ok({
      history: [
        createHistoryEvent({
          leadId: lead.id,
          eventType: "lead_reviewed",
          actorUserId,
          payload: {
            status: intent.status,
            prioridad: intent.prioridad,
            reason: intent.reason,
            fromStage: lead.stage,
            toStage: patch.stage ?? lead.stage,
          },
          occurredAt: now,
        }),
        createHistoryEvent({
          leadId: lead.id,
          eventType: "workflow_stage_changed",
          actorUserId,
          payload: {
            from: lead.stage,
            to: patch.stage ?? lead.stage,
          },
          occurredAt: now,
        }),
      ],
      audit: {
        action: "lead_reviewed",
        entityId: lead.id,
        changes: {
          fromStage: lead.stage,
          toStage: patch.stage,
          fromStatus: lead.status,
          toStatus: intent.status,
          fromPrioridad: lead.prioridad,
          toPrioridad: intent.prioridad,
          reason: intent.reason,
        },
      },
    });
  }

  if (intent.kind === "imported_review") {
    if (intent.type === "import_status") {
      return Ok({
        history: [
          createHistoryEvent({
            leadId: lead.id,
            eventType: "lead_status_updated",
            actorUserId,
            payload: {
              fromStatus: lead.status,
              toStatus: intent.status ?? lead.status ?? "DISPONIBLE",
              reason: intent.reason,
            },
            occurredAt: now,
          }),
        ],
        audit: {
          action: "lead_status_imported",
          entityId: lead.id,
          changes: {
            fromStatus: lead.status,
            toStatus: intent.status,
            reason: intent.reason,
          },
        },
      });
    }

    return Ok({
      history: [
        createHistoryEvent({
          leadId: lead.id,
          eventType: "lead_priority_updated",
          actorUserId,
          payload: {
            fromPrioridad: lead.prioridad,
            toPrioridad: intent.prioridad ?? lead.prioridad ?? "P1",
            reason: intent.reason,
          },
          occurredAt: now,
        }),
      ],
      audit: {
        action: "lead_priority_imported",
        entityId: lead.id,
        changes: {
          fromPrioridad: lead.prioridad,
          toPrioridad: intent.prioridad,
          reason: intent.reason,
        },
      },
    });
  }

  if (intent.kind === "approve_for_sale") {
    return Ok({
      history: [
        createHistoryEvent({
          leadId: lead.id,
          eventType: "sale_approved",
          actorUserId,
          payload: null,
          occurredAt: now,
        }),
        createHistoryEvent({
          leadId: lead.id,
          eventType: "workflow_stage_changed",
          actorUserId,
          payload: { from: lead.stage, to: "READY_FOR_SALE" },
          occurredAt: now,
        }),
      ],
      audit: {
        action: "sale_approved",
        entityId: lead.id,
        changes: { from: lead.stage, to: "READY_FOR_SALE" },
      },
    });
  }

  if (intent.kind === "create_quotation") {
    return Ok({
      history: [
        createHistoryEvent({
          leadId: lead.id,
          eventType: "quotation_created",
          actorUserId,
          payload: {
            quotationId: intent.quotationId,
            version: intent.version,
            moneda: intent.moneda,
          },
          occurredAt: now,
        }),
        createHistoryEvent({
          leadId: lead.id,
          eventType: "workflow_stage_changed",
          actorUserId,
          payload: { from: lead.stage, to: "QUOTED" },
          occurredAt: now,
        }),
      ],
      audit: {
        action: "quotation_created",
        entityId: lead.id,
        changes: {
          quotationId: intent.quotationId,
          version: intent.version,
          to: "QUOTED",
        },
      },
    });
  }

  if (intent.kind === "complete_commercial_input") {
    return Ok({
      history: [
        createHistoryEvent({
          leadId: lead.id,
          eventType: "commercial_input_completed",
          actorUserId,
          payload: {
            proveedorActual: intent.proveedorActual,
            tasaActual: intent.tasaActual,
            gpv: intent.gpv,
            ticket: intent.ticket,
            giroNegocio: intent.giroNegocio,
            tipoProducto: intent.tipoProducto,
            urlCliente: intent.urlCliente,
            modalidadCobro: intent.modalidadCobro,
            repLegalNombres: intent.repLegalNombres,
            repLegalDni: intent.repLegalDni,
          },
          occurredAt: now,
        }),
        createHistoryEvent({
          leadId: lead.id,
          eventType: "workflow_stage_changed",
          actorUserId,
          payload: { from: lead.stage, to: "READY_FOR_QUOTATION" },
          occurredAt: now,
        }),
      ],
      audit: {
        action: "commercial_input_completed",
        entityId: lead.id,
        changes: { from: lead.stage, to: "READY_FOR_QUOTATION" },
      },
    });
  }

  if (intent.kind === "create_sale") {
    return Ok({
      history: [
        createHistoryEvent({
          leadId: lead.id,
          eventType: "sale_created",
          actorUserId,
          payload: { saleId: intent.saleId },
          occurredAt: now,
        }),
        createHistoryEvent({
          leadId: lead.id,
          eventType: "workflow_stage_changed",
          actorUserId,
          payload: { from: lead.stage, to: "CONVERTED" },
          occurredAt: now,
        }),
      ],
      audit: {
        action: "sale_created",
        entityId: lead.id,
        changes: { saleId: intent.saleId, to: "CONVERTED" },
      },
    });
  }

  if (intent.kind === "create_sale_venue") {
    const history: LeadHistoryEventDraft[] = [
      createHistoryEvent({
        leadId: lead.id,
        eventType: "venue_added",
        actorUserId,
        payload: {
          venueId: intent.venueId,
          saleId: intent.saleId,
          nombreComercial: intent.nombreComercial,
          isFirstVenue: intent.isFirstVenue,
        },
        occurredAt: now,
      }),
    ];

    if (intent.isFirstVenue) {
      history.push(
        createHistoryEvent({
          leadId: lead.id,
          eventType: "workflow_stage_changed",
          actorUserId,
          payload: { from: lead.stage, to: "CONVERTED" },
          occurredAt: now,
        }),
      );
    }

    return Ok({
      history,
      audit: {
        action: "venue_added",
        entityId: lead.id,
        changes: {
          venueId: intent.venueId,
          saleId: intent.saleId,
          isFirstVenue: intent.isFirstVenue,
        },
      },
    });
  }

  return Ok({
    history: [],
    audit: {
      action: "lead_updated",
      entityId: lead.id,
      changes: {},
    },
  });
}
