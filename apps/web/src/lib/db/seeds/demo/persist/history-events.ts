import { randomUUIDv7 } from "bun";
import type { Kysely } from "kysely";

import type {
  WorkflowLeadId,
  WorkflowRateProposalId,
  WorkflowVenueId,
} from "~/server/shared/ids";

import type { Database } from "../../../types";
import { BACK_OFFICE, EXECUTIVES, SUPERVISORS } from "../scenario";

export type WorkflowLeadIds = {
  idPending: WorkflowLeadId;
  idNeeds: WorkflowLeadId;
  idReady: WorkflowLeadId;
  idQuoted: WorkflowLeadId;
  idForSale: WorkflowLeadId;
  idConverted: WorkflowLeadId;
  idRejected: WorkflowLeadId;
};

export type WorkflowCommercialIds = {
  qidQuoted: WorkflowRateProposalId;
  qidForSale: WorkflowRateProposalId;
  qidConverted: WorkflowRateProposalId;
  vidConverted: WorkflowVenueId;
};

export async function persistWorkflowHistoryEvents(
  db: Kysely<Database>,
  now: number,
  day: number,
  leadIds: WorkflowLeadIds,
  commercialIds: WorkflowCommercialIds,
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
  const { qidQuoted, qidForSale, qidConverted, vidConverted } = commercialIds;
  await db
    .deleteFrom("events")
    .where("entity_type", "=", "lead")
    .where("entity_id", "in", [
      idPending,
      idNeeds,
      idReady,
      idQuoted,
      idForSale,
      idConverted,
      idRejected,
    ])
    .execute();
  const leadEvents = [
    {
      id: randomUUIDv7(),
      lead_id: idPending,
      event_type: "lead_registered",
      actor_user_id: SUPERVISORS.DIEGO,
      subject_user_id: null,
      payload_json: JSON.stringify({
        ruc: "20103615080",
        toStage: "QUALIFYING",
      }),
      occurred_at: now - day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idPending,
      event_type: "lead_assigned",
      actor_user_id: SUPERVISORS.DIEGO,
      subject_user_id: EXECUTIVES.CAMILA,
      payload_json: JSON.stringify({ executiveId: EXECUTIVES.CAMILA }),
      occurred_at: now - day + 1_000,
    },

    {
      id: randomUUIDv7(),
      lead_id: idNeeds,
      event_type: "lead_registered",
      actor_user_id: SUPERVISORS.DIEGO,
      subject_user_id: null,
      payload_json: JSON.stringify({
        ruc: "20103176060",
        toStage: "QUALIFYING",
      }),
      occurred_at: now - 4 * day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idNeeds,
      event_type: "lead_assigned",
      actor_user_id: SUPERVISORS.DIEGO,
      subject_user_id: EXECUTIVES.MATIAS,
      payload_json: JSON.stringify({ executiveId: EXECUTIVES.MATIAS }),
      occurred_at: now - 4 * day + 1_000,
    },
    {
      id: randomUUIDv7(),
      lead_id: idNeeds,
      event_type: "lead_reviewed",
      actor_user_id: BACK_OFFICE.JOSEFINA,
      subject_user_id: null,
      payload_json: JSON.stringify({
        status: "DISPONIBLE",
        priority: "P2",
        reason: "Disponible según la consulta de cartera de Culqi",
        fromStage: "QUALIFYING",
        toStage: "PRICING",
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
        from: "QUALIFYING",
        to: "PRICING",
      }),
      occurred_at: now - 3 * day + 100,
    },

    {
      id: randomUUIDv7(),
      lead_id: idReady,
      event_type: "lead_registered",
      actor_user_id: SUPERVISORS.DIEGO,
      subject_user_id: null,
      payload_json: JSON.stringify({
        ruc: "20538856674",
        toStage: "QUALIFYING",
      }),
      occurred_at: now - 7 * day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idReady,
      event_type: "lead_assigned",
      actor_user_id: SUPERVISORS.DIEGO,
      subject_user_id: EXECUTIVES.LUCIA,
      payload_json: JSON.stringify({ executiveId: EXECUTIVES.LUCIA }),
      occurred_at: now - 7 * day + 1_000,
    },
    {
      id: randomUUIDv7(),
      lead_id: idReady,
      event_type: "lead_reviewed",
      actor_user_id: BACK_OFFICE.JOSEFINA,
      subject_user_id: null,
      payload_json: JSON.stringify({
        status: "DISPONIBLE",
        priority: "P1",
        reason: "Cliente disponible con alto volumen, excelente candidato",
        fromStage: "QUALIFYING",
        toStage: "PRICING",
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
        from: "QUALIFYING",
        to: "PRICING",
      }),
      occurred_at: now - 6 * day + 100,
    },

    {
      id: randomUUIDv7(),
      lead_id: idQuoted,
      event_type: "lead_registered",
      actor_user_id: SUPERVISORS.NICOLAS,
      subject_user_id: null,
      payload_json: JSON.stringify({
        ruc: "20542245671",
        toStage: "QUALIFYING",
      }),
      occurred_at: now - 14 * day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idQuoted,
      event_type: "lead_assigned",
      actor_user_id: SUPERVISORS.NICOLAS,
      subject_user_id: EXECUTIVES.SOFIA,
      payload_json: JSON.stringify({ executiveId: EXECUTIVES.SOFIA }),
      occurred_at: now - 14 * day + 1_000,
    },
    {
      id: randomUUIDv7(),
      lead_id: idQuoted,
      event_type: "lead_reviewed",
      actor_user_id: BACK_OFFICE.GABRIEL,
      subject_user_id: null,
      payload_json: JSON.stringify({
        status: "DISPONIBLE",
        priority: "P2",
        reason: "Cliente disponible, listo para proponer tarifa competitiva",
        fromStage: "QUALIFYING",
        toStage: "PRICING",
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
        from: "QUALIFYING",
        to: "PRICING",
      }),
      occurred_at: now - 13 * day + 100,
    },
    {
      id: randomUUIDv7(),
      lead_id: idQuoted,
      event_type: "rate_proposed",
      actor_user_id: BACK_OFFICE.GABRIEL,
      subject_user_id: null,
      payload_json: JSON.stringify({
        proposalId: qidQuoted,
        round: 1,
        currency: "PEN",
      }),
      occurred_at: now - 10 * day,
    },

    {
      id: randomUUIDv7(),
      lead_id: idForSale,
      event_type: "lead_registered",
      actor_user_id: SUPERVISORS.DIEGO,
      subject_user_id: null,
      payload_json: JSON.stringify({
        ruc: "20394809218",
        toStage: "QUALIFYING",
      }),
      occurred_at: now - 21 * day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idForSale,
      event_type: "lead_assigned",
      actor_user_id: SUPERVISORS.DIEGO,
      subject_user_id: EXECUTIVES.FERNANDA,
      payload_json: JSON.stringify({ executiveId: EXECUTIVES.FERNANDA }),
      occurred_at: now - 21 * day + 1_000,
    },
    {
      id: randomUUIDv7(),
      lead_id: idForSale,
      event_type: "lead_reviewed",
      actor_user_id: BACK_OFFICE.JOSEFINA,
      subject_user_id: null,
      payload_json: JSON.stringify({
        status: "DISPONIBLE",
        priority: "P1",
        reason: "Empresa con alta facturación, perfil ideal para conversión",
        fromStage: "QUALIFYING",
        toStage: "PRICING",
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
        from: "QUALIFYING",
        to: "PRICING",
      }),
      occurred_at: now - 20 * day + 100,
    },
    {
      id: randomUUIDv7(),
      lead_id: idForSale,
      event_type: "rate_proposed",
      actor_user_id: BACK_OFFICE.JOSEFINA,
      subject_user_id: null,
      payload_json: JSON.stringify({
        proposalId: qidForSale,
        round: 1,
        currency: "PEN",
      }),
      occurred_at: now - 18 * day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idForSale,
      event_type: "rate_accepted",
      actor_user_id: EXECUTIVES.FERNANDA,
      subject_user_id: null,
      payload_json: JSON.stringify({ proposalId: qidForSale }),
      occurred_at: now - 16 * day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idForSale,
      event_type: "workflow_stage_changed",
      actor_user_id: null,
      subject_user_id: null,
      payload_json: JSON.stringify({
        from: "PRICING",
        to: "SETUP",
      }),
      occurred_at: now - 16 * day + 100,
    },

    {
      id: randomUUIDv7(),
      lead_id: idConverted,
      event_type: "lead_registered",
      actor_user_id: SUPERVISORS.DIEGO,
      subject_user_id: null,
      payload_json: JSON.stringify({
        ruc: "20219523468",
        toStage: "QUALIFYING",
      }),
      occurred_at: now - 30 * day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idConverted,
      event_type: "lead_assigned",
      actor_user_id: SUPERVISORS.DIEGO,
      subject_user_id: EXECUTIVES.CLAUDIA,
      payload_json: JSON.stringify({ executiveId: EXECUTIVES.CLAUDIA }),
      occurred_at: now - 30 * day + 1_000,
    },
    {
      id: randomUUIDv7(),
      lead_id: idConverted,
      event_type: "lead_reviewed",
      actor_user_id: BACK_OFFICE.JOSEFINA,
      subject_user_id: null,
      payload_json: JSON.stringify({
        status: "DISPONIBLE",
        priority: "P1",
        reason: "Empresa constructora consolidada con gran volumen potencial",
        fromStage: "QUALIFYING",
        toStage: "PRICING",
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
        from: "QUALIFYING",
        to: "PRICING",
      }),
      occurred_at: now - 29 * day + 100,
    },
    {
      id: randomUUIDv7(),
      lead_id: idConverted,
      event_type: "rate_proposed",
      actor_user_id: BACK_OFFICE.JOSEFINA,
      subject_user_id: null,
      payload_json: JSON.stringify({
        proposalId: qidConverted,
        round: 1,
        currency: "PEN",
      }),
      occurred_at: now - 27 * day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idConverted,
      event_type: "rate_accepted",
      actor_user_id: EXECUTIVES.CLAUDIA,
      subject_user_id: null,
      payload_json: JSON.stringify({ proposalId: qidConverted }),
      occurred_at: now - 25 * day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idConverted,
      event_type: "workflow_stage_changed",
      actor_user_id: null,
      subject_user_id: null,
      payload_json: JSON.stringify({
        from: "PRICING",
        to: "SETUP",
      }),
      occurred_at: now - 25 * day + 100,
    },
    {
      id: randomUUIDv7(),
      lead_id: idConverted,
      event_type: "venue_added",
      actor_user_id: EXECUTIVES.CLAUDIA,
      subject_user_id: null,
      payload_json: JSON.stringify({
        venueId: vidConverted,
        tradeName: "Andes Miraflores",
      }),
      occurred_at: now - 22 * day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idConverted,
      event_type: "venue_accounts_added",
      actor_user_id: EXECUTIVES.CLAUDIA,
      subject_user_id: null,
      payload_json: JSON.stringify({ venueId: vidConverted }),
      occurred_at: now - 20 * day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idConverted,
      event_type: "workflow_stage_changed",
      actor_user_id: null,
      subject_user_id: null,
      payload_json: JSON.stringify({
        from: "SETUP",
        to: "LIVE",
      }),
      occurred_at: now - 20 * day + 100,
    },

    {
      id: randomUUIDv7(),
      lead_id: idRejected,
      event_type: "lead_registered",
      actor_user_id: SUPERVISORS.NICOLAS,
      subject_user_id: null,
      payload_json: JSON.stringify({
        ruc: "20353745400",
        toStage: "QUALIFYING",
      }),
      occurred_at: now - 3 * day,
    },
    {
      id: randomUUIDv7(),
      lead_id: idRejected,
      event_type: "lead_assigned",
      actor_user_id: SUPERVISORS.NICOLAS,
      subject_user_id: EXECUTIVES.PABLO,
      payload_json: JSON.stringify({ executiveId: EXECUTIVES.PABLO }),
      occurred_at: now - 3 * day + 1_000,
    },
    {
      id: randomUUIDv7(),
      lead_id: idRejected,
      event_type: "lead_reviewed",
      actor_user_id: BACK_OFFICE.GABRIEL,
      subject_user_id: null,
      payload_json: JSON.stringify({
        status: "CARTERIZADO",
        priority: "SIN RESULTADO",
        reason: "Empresa ya carterizada por otro dealer según Culqi",
        fromStage: "QUALIFYING",
        toStage: "DISQUALIFIED",
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
        from: "QUALIFYING",
        to: "DISQUALIFIED",
      }),
      occurred_at: now - 2 * day + 100,
    },
  ] as const;

  await db
    .insertInto("events")
    .values(
      leadEvents.map((event) => ({
        id: event.id,
        entity_type: "lead",
        entity_id: event.lead_id,
        type: event.event_type,
        actor_user_id: event.actor_user_id,
        subject_user_id: event.subject_user_id,
        payload_json: event.payload_json,
        changes_json: null,
        occurred_at: new Date(event.occurred_at),
      })),
    )
    .execute();
}
