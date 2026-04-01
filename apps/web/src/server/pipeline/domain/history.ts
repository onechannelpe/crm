import type { LeadCallOutcome, PipelineHistoryEventType } from "~/lib/db/types";

export type PipelineHistoryEventPayload =
  | { ruc: string; toStage: "PENDING_EXTERNAL_REVIEW" }
  | {
      status: string;
      prioridad: string;
      reason: string;
      fromStage: string;
      toStage: string;
    }
  | { from: string; to: string }
  | { executiveId: number; reason?: string }
  | { fromExecutiveId: number; toExecutiveId: number; reason?: string }
  | {
      proveedorActual: string;
      tasaActual: number;
      gpv: number;
      ticket: number;
      abono: number;
      cantidadPos: number;
    }
  | { quotationId: number; version: number; moneda: "PEN" | "USD" }
  | { saleId: number }
  | { outcome: LeadCallOutcome; notes: string | null }
  | { body: string };

export type PipelineHistoryEventDraft = {
  lead_id: number;
  event_type: PipelineHistoryEventType;
  actor_user_id: number | null;
  subject_user_id: number | null;
  payload_json: string | null;
  occurred_at: number;
};

export function createHistoryEvent(input: {
  leadId: number;
  eventType: PipelineHistoryEventType;
  actorUserId?: number | null;
  subjectUserId?: number | null;
  payload?: PipelineHistoryEventPayload;
  occurredAt: number;
}): PipelineHistoryEventDraft {
  return {
    lead_id: input.leadId,
    event_type: input.eventType,
    actor_user_id: input.actorUserId ?? null,
    subject_user_id: input.subjectUserId ?? null,
    payload_json: input.payload ? JSON.stringify(input.payload) : null,
    occurred_at: input.occurredAt,
  };
}
