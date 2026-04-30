import { randomUUIDv7 } from "bun";
import type { Kysely } from "kysely";

import type { Database } from "../../../types";
import {
  BO1,
  BO2,
  EXEC_ANDREA,
  EXEC_CAMILA,
  EXEC_DANIELA,
  EXEC_GABRIEL,
  EXEC_PATRICIA,
  EXEC_RENATO,
  EXEC_ROBERTO,
  SUP1,
  SUP2,
} from "../scenario";

export type WorkflowLeadIds = {
  idPending: string;
  idNeeds: string;
  idReady: string;
  idQuoted: string;
  idForSale: string;
  idConverted: string;
  idRejected: string;
};

export type WorkflowArtifactIds = {
  qidQuoted: string;
  qidForSale: string;
  qidConverted: string;
  sidConverted: string;
  vidConverted: string;
};

export async function persistWorkflowHistoryEvents(
  db: Kysely<Database>,
  now: number,
  day: number,
  leadIds: WorkflowLeadIds,
  artifacts: WorkflowArtifactIds,
): Promise<void> {
  const {
    idPending,
    idNeeds,
    idReady,
    idQuoted,
    idForSale,
    idConverted,
    idRejected,
  } = leadIds;
  const { qidQuoted, qidForSale, qidConverted, sidConverted, vidConverted } =
    artifacts;
  await db
    .deleteFrom("workflow_history_events")
    .where("lead_id", "in", [
      idPending,
      idNeeds,
      idReady,
      idQuoted,
      idForSale,
      idConverted,
      idRejected,
    ])
    .execute();
  await db
    .insertInto("workflow_history_events")
    .values([
      // Lead: PENDING_EXTERNAL_REVIEW
      {
        id: randomUUIDv7(),
        lead_id: idPending,
        event_type: "lead_registered",
        actor_user_id: SUP1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20103615080",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idPending,
        event_type: "lead_assigned",
        actor_user_id: SUP1,
        subject_user_id: EXEC_CAMILA,
        payload_json: JSON.stringify({ executiveId: EXEC_CAMILA }),
        occurred_at: now - day + 1_000,
      },

      // Lead: NEEDS_EXECUTIVE_INPUT
      {
        id: randomUUIDv7(),
        lead_id: idNeeds,
        event_type: "lead_registered",
        actor_user_id: SUP1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20103176060",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - 4 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idNeeds,
        event_type: "lead_assigned",
        actor_user_id: SUP1,
        subject_user_id: EXEC_PATRICIA,
        payload_json: JSON.stringify({ executiveId: EXEC_PATRICIA }),
        occurred_at: now - 4 * day + 1_000,
      },
      {
        id: randomUUIDv7(),
        lead_id: idNeeds,
        event_type: "lead_reviewed",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          status: "DISPONIBLE",
          prioridad: "SIN RESULTADO",
          reason:
            "Cliente sin resultado en primera llamada, requiere seguimiento del ejecutivo",
          fromStage: "PENDING_EXTERNAL_REVIEW",
          toStage: "NEEDS_EXECUTIVE_INPUT",
        }),
        occurred_at: now - 3 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idNeeds,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "PENDING_EXTERNAL_REVIEW",
          to: "NEEDS_EXECUTIVE_INPUT",
        }),
        occurred_at: now - 3 * day + 100,
      },

      // Lead: READY_FOR_QUOTATION
      {
        id: randomUUIDv7(),
        lead_id: idReady,
        event_type: "lead_registered",
        actor_user_id: SUP1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20538856674",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - 7 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idReady,
        event_type: "lead_assigned",
        actor_user_id: SUP1,
        subject_user_id: EXEC_ROBERTO,
        payload_json: JSON.stringify({ executiveId: EXEC_ROBERTO }),
        occurred_at: now - 7 * day + 1_000,
      },
      {
        id: randomUUIDv7(),
        lead_id: idReady,
        event_type: "lead_reviewed",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          status: "DISPONIBLE",
          prioridad: "P1",
          reason:
            "Cliente activo con alto volumen de operaciones, excelente candidato",
          fromStage: "PENDING_EXTERNAL_REVIEW",
          toStage: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 6 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idReady,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "PENDING_EXTERNAL_REVIEW",
          to: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 6 * day + 100,
      },

      // Lead: QUOTED
      {
        id: randomUUIDv7(),
        lead_id: idQuoted,
        event_type: "lead_registered",
        actor_user_id: SUP2,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20542245671",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - 14 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idQuoted,
        event_type: "lead_assigned",
        actor_user_id: SUP2,
        subject_user_id: EXEC_ANDREA,
        payload_json: JSON.stringify({ executiveId: EXEC_ANDREA }),
        occurred_at: now - 14 * day + 1_000,
      },
      {
        id: randomUUIDv7(),
        lead_id: idQuoted,
        event_type: "lead_reviewed",
        actor_user_id: BO2,
        subject_user_id: null,
        payload_json: JSON.stringify({
          status: "DISPONIBLE",
          prioridad: "P2",
          reason:
            "Cliente interesado, solicito cotizacion competitiva frente a proveedor actual",
          fromStage: "PENDING_EXTERNAL_REVIEW",
          toStage: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 13 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idQuoted,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "PENDING_EXTERNAL_REVIEW",
          to: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 13 * day + 100,
      },
      {
        id: randomUUIDv7(),
        lead_id: idQuoted,
        event_type: "quotation_created",
        actor_user_id: BO2,
        subject_user_id: null,
        payload_json: JSON.stringify({
          quotationId: qidQuoted,
          version: 1,
          moneda: "PEN",
        }),
        occurred_at: now - 10 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idQuoted,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "READY_FOR_QUOTATION",
          to: "QUOTED",
        }),
        occurred_at: now - 10 * day + 100,
      },

      // Lead: READY_FOR_SALE
      {
        id: randomUUIDv7(),
        lead_id: idForSale,
        event_type: "lead_registered",
        actor_user_id: SUP1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20394809218",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - 21 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idForSale,
        event_type: "lead_assigned",
        actor_user_id: SUP1,
        subject_user_id: EXEC_RENATO,
        payload_json: JSON.stringify({ executiveId: EXEC_RENATO }),
        occurred_at: now - 21 * day + 1_000,
      },
      {
        id: randomUUIDv7(),
        lead_id: idForSale,
        event_type: "lead_reviewed",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          status: "DISPONIBLE",
          prioridad: "P1",
          reason:
            "Empresa con alta facturacion mensual, perfil ideal para conversion",
          fromStage: "PENDING_EXTERNAL_REVIEW",
          toStage: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 20 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idForSale,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "PENDING_EXTERNAL_REVIEW",
          to: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 20 * day + 100,
      },
      {
        id: randomUUIDv7(),
        lead_id: idForSale,
        event_type: "quotation_created",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          quotationId: qidForSale,
          version: 1,
          moneda: "PEN",
        }),
        occurred_at: now - 18 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idForSale,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "READY_FOR_QUOTATION",
          to: "QUOTED",
        }),
        occurred_at: now - 18 * day + 100,
      },
      {
        id: randomUUIDv7(),
        lead_id: idForSale,
        event_type: "sale_approved",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: null,
        occurred_at: now - 15 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idForSale,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "QUOTED",
          to: "READY_FOR_SALE",
        }),
        occurred_at: now - 15 * day + 100,
      },

      // Lead: CONVERTED
      {
        id: randomUUIDv7(),
        lead_id: idConverted,
        event_type: "lead_registered",
        actor_user_id: SUP1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20219523468",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - 30 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idConverted,
        event_type: "lead_assigned",
        actor_user_id: SUP1,
        subject_user_id: EXEC_DANIELA,
        payload_json: JSON.stringify({ executiveId: EXEC_DANIELA }),
        occurred_at: now - 30 * day + 1_000,
      },
      {
        id: randomUUIDv7(),
        lead_id: idConverted,
        event_type: "lead_reviewed",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          status: "DISPONIBLE",
          prioridad: "P1",
          reason:
            "Empresa constructora consolidada con gran volumen potencial y apertura al cambio",
          fromStage: "PENDING_EXTERNAL_REVIEW",
          toStage: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 29 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idConverted,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "PENDING_EXTERNAL_REVIEW",
          to: "READY_FOR_QUOTATION",
        }),
        occurred_at: now - 29 * day + 100,
      },
      {
        id: randomUUIDv7(),
        lead_id: idConverted,
        event_type: "quotation_created",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: JSON.stringify({
          quotationId: qidConverted,
          version: 1,
          moneda: "PEN",
        }),
        occurred_at: now - 27 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idConverted,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "READY_FOR_QUOTATION",
          to: "QUOTED",
        }),
        occurred_at: now - 27 * day + 100,
      },
      {
        id: randomUUIDv7(),
        lead_id: idConverted,
        event_type: "sale_approved",
        actor_user_id: BO1,
        subject_user_id: null,
        payload_json: null,
        occurred_at: now - 25 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idConverted,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "QUOTED",
          to: "READY_FOR_SALE",
        }),
        occurred_at: now - 25 * day + 100,
      },
      {
        id: randomUUIDv7(),
        lead_id: idConverted,
        event_type: "venue_added",
        actor_user_id: EXEC_DANIELA,
        subject_user_id: null,
        payload_json: JSON.stringify({
          venueId: vidConverted,
          saleId: sidConverted,
          nombreComercial: "Andes Miraflores",
          isFirstVenue: true,
        }),
        occurred_at: now - 20 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idConverted,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "READY_FOR_SALE",
          to: "CONVERTED",
        }),
        occurred_at: now - 20 * day + 100,
      },

      // Lead: REJECTED_BY_STATUS
      {
        id: randomUUIDv7(),
        lead_id: idRejected,
        event_type: "lead_registered",
        actor_user_id: SUP2,
        subject_user_id: null,
        payload_json: JSON.stringify({
          ruc: "20353745400",
          toStage: "PENDING_EXTERNAL_REVIEW",
        }),
        occurred_at: now - 3 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idRejected,
        event_type: "lead_assigned",
        actor_user_id: SUP2,
        subject_user_id: EXEC_GABRIEL,
        payload_json: JSON.stringify({ executiveId: EXEC_GABRIEL }),
        occurred_at: now - 3 * day + 1_000,
      },
      {
        id: randomUUIDv7(),
        lead_id: idRejected,
        event_type: "lead_reviewed",
        actor_user_id: BO2,
        subject_user_id: null,
        payload_json: JSON.stringify({
          status: "CARTERIZADO",
          prioridad: "SIN RESULTADO",
          reason:
            "Empresa ya tiene contrato activo con otro proveedor sin apertura a negociar",
          fromStage: "PENDING_EXTERNAL_REVIEW",
          toStage: "REJECTED_BY_STATUS",
        }),
        occurred_at: now - 2 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idRejected,
        event_type: "workflow_stage_changed",
        actor_user_id: null,
        subject_user_id: null,
        payload_json: JSON.stringify({
          from: "PENDING_EXTERNAL_REVIEW",
          to: "REJECTED_BY_STATUS",
        }),
        occurred_at: now - 2 * day + 100,
      },
    ])
    .execute();
}
