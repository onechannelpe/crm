import { randomUUIDv7 } from "bun";
import type { Kysely } from "kysely";

import type { OrganizationId } from "~/server/shared/ids";

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
  type OrganizationSeedKey,
} from "../scenario";
import type { WorkflowLeadIds } from "./history-events";

export async function persistWorkflowLeadsAndAssignments(
  db: Kysely<Database>,
  now: number,
  day: number,
  getOrganizationId: (key: OrganizationSeedKey) => OrganizationId,
  leadIds: WorkflowLeadIds,
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
  await db
    .insertInto("workflow_leads")
    .values([
      {
        id: idPending,
        organization_id: getOrganizationId("pending"),
        executive_id: EXEC_CAMILA,
        stage: "PENDING_EXTERNAL_REVIEW",
        status: null,
        prioridad: null,
        created_by: SUP1,
        updated_by: null,
        created_at: now - day,
        updated_at: now - day,
      },
      {
        id: idNeeds,
        organization_id: getOrganizationId("needs"),
        executive_id: EXEC_PATRICIA,
        stage: "NEEDS_EXECUTIVE_INPUT",
        status: "DISPONIBLE",
        prioridad: "SIN RESULTADO",
        created_by: SUP1,
        updated_by: BO1,
        created_at: now - 4 * day,
        updated_at: now - 3 * day,
      },
      {
        id: idReady,
        organization_id: getOrganizationId("ready"),
        executive_id: EXEC_ROBERTO,
        stage: "READY_FOR_QUOTATION",
        status: "DISPONIBLE",
        prioridad: "P1",
        created_by: SUP1,
        updated_by: BO1,
        created_at: now - 7 * day,
        updated_at: now - 6 * day,
      },
      {
        id: idQuoted,
        organization_id: getOrganizationId("quoted"),
        executive_id: EXEC_ANDREA,
        stage: "QUOTED",
        status: "DISPONIBLE",
        prioridad: "P2",
        created_by: SUP2,
        updated_by: BO2,
        created_at: now - 14 * day,
        updated_at: now - 10 * day,
      },
      {
        id: idForSale,
        organization_id: getOrganizationId("forSale"),
        executive_id: EXEC_RENATO,
        stage: "READY_FOR_SALE",
        status: "DISPONIBLE",
        prioridad: "P1",
        created_by: SUP1,
        updated_by: BO1,
        created_at: now - 21 * day,
        updated_at: now - 15 * day,
      },
      {
        id: idConverted,
        organization_id: getOrganizationId("converted"),
        executive_id: EXEC_DANIELA,
        stage: "CONVERTED",
        status: "DISPONIBLE",
        prioridad: "P1",
        created_by: SUP1,
        updated_by: EXEC_DANIELA,
        created_at: now - 30 * day,
        updated_at: now - 20 * day,
      },
      {
        id: idRejected,
        organization_id: getOrganizationId("rejected"),
        executive_id: EXEC_GABRIEL,
        stage: "REJECTED_BY_STATUS",
        status: "CARTERIZADO",
        prioridad: "SIN RESULTADO",
        created_by: SUP2,
        updated_by: BO2,
        created_at: now - 3 * day,
        updated_at: now - 2 * day,
      },
    ])
    .execute();

  await db
    .insertInto("workflow_lead_assignments")
    .values([
      {
        id: randomUUIDv7(),
        lead_id: idPending,
        executive_id: EXEC_CAMILA,
        assigned_by: SUP1,
        is_active: 1,
        assigned_at: now - day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idNeeds,
        executive_id: EXEC_PATRICIA,
        assigned_by: SUP1,
        is_active: 1,
        assigned_at: now - 4 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idReady,
        executive_id: EXEC_ROBERTO,
        assigned_by: SUP1,
        is_active: 1,
        assigned_at: now - 7 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idQuoted,
        executive_id: EXEC_ANDREA,
        assigned_by: SUP2,
        is_active: 1,
        assigned_at: now - 14 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idForSale,
        executive_id: EXEC_RENATO,
        assigned_by: SUP1,
        is_active: 1,
        assigned_at: now - 21 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idConverted,
        executive_id: EXEC_DANIELA,
        assigned_by: SUP1,
        is_active: 1,
        assigned_at: now - 30 * day,
      },
      {
        id: randomUUIDv7(),
        lead_id: idRejected,
        executive_id: EXEC_GABRIEL,
        assigned_by: SUP2,
        is_active: 1,
        assigned_at: now - 3 * day,
      },
    ])
    .execute();
}
