import { randomUUIDv7 } from "bun";
import type { Kysely } from "kysely";

import type { OrganizationId } from "~/server/shared/ids";

import type { Database } from "../../../types";
import { BO1, BO2, EXEC_DANIELA } from "../scenario";
import type { WorkflowArtifactIds, WorkflowLeadIds } from "./history-events";

export async function persistWorkflowCommercialData(
  db: Kysely<Database>,
  now: number,
  day: number,
  leadIds: WorkflowLeadIds,
  artifacts: WorkflowArtifactIds,
  getOrganizationId: (key: "converted") => OrganizationId,
): Promise<void> {
  const { idQuoted, idForSale, idConverted } = leadIds;
  const { qidQuoted, qidForSale, qidConverted, sidConverted, vidConverted } = artifacts;
  await db
    .insertInto("workflow_quotations")
    .values([
      {
        id: qidQuoted,
        lead_id: idQuoted,
        payback_pricing: 1.2,
        tarifa_debito: 0.9,
        tarifa_credito: 2.3,
        tarifa_foraneo: 1.7,
        fee: 18.0,
        moneda: "PEN",
        version: 1,
        created_at: now - 10 * day,
        created_by: BO2,
      },
      {
        id: qidForSale,
        lead_id: idForSale,
        payback_pricing: 1.15,
        tarifa_debito: 0.85,
        tarifa_credito: 2.2,
        tarifa_foraneo: 1.6,
        fee: 20.0,
        moneda: "PEN",
        version: 1,
        created_at: now - 18 * day,
        created_by: BO1,
      },
      {
        id: qidConverted,
        lead_id: idConverted,
        payback_pricing: 1.25,
        tarifa_debito: 0.95,
        tarifa_credito: 2.5,
        tarifa_foraneo: 1.8,
        fee: 15.0,
        moneda: "PEN",
        version: 1,
        created_at: now - 27 * day,
        created_by: BO1,
      },
    ])
    .execute();

  await db
    .insertInto("workflow_sales")
    .values([
      {
        id: sidConverted,
        lead_id: idConverted,
        executive_id: EXEC_DANIELA,
        created_at: now - 20 * day,
      },
    ])
    .execute();

  await db
    .insertInto("workflow_sale_venues")
    .values([
      {
        id: vidConverted,
        sale_id: sidConverted,
        lead_id: idConverted,
        nombre_comercial: "Andes Miraflores",
        cantidad_pos: 3,
        direccion: "AV. BENAVIDES NRO. 1855",
        referencia: "Frente al parque central",
        distrito: "MIRAFLORES",
        provincia: "LIMA",
        departamento: "LIMA",
        created_at: now - 20 * day,
        created_by: EXEC_DANIELA,
      },
    ])
    .execute();

  await db
    .insertInto("workflow_sale_venue_accounts")
    .values([
      {
        id: randomUUIDv7(),
        venue_id: vidConverted,
        currency: "PEN",
        bank: "BCP",
        account_type: "CORRIENTE",
        account_number: "194-12345678-0-21",
        cci: null,
        is_settlement: 1,
      },
      {
        id: randomUUIDv7(),
        venue_id: vidConverted,
        currency: "USD",
        bank: "BBVA",
        account_type: "AHORROS",
        account_number: "0011-0245-9988776655",
        cci: "01124500998877665522",
        is_settlement: 0,
      },
    ])
    .execute();

  await db
    .insertInto("workflow_lead_commercial_inputs")
    .values([
      {
        lead_id: idConverted,
        proveedor_actual: "BBVA",
        tasa_actual: 2.8,
        gpv: 85_000.0,
        ticket: 245.5,
        tipo_producto: "CULQI_FULL",
        url_cliente: null,
        modalidad_cobro: "CARGO_UNICO",
        updated_at: now - 29 * day,
        updated_by: BO1,
      },
    ])
    .execute();

  const convertedOrgId = getOrganizationId("converted");
  await db
    .updateTable("organizations")
    .set({ giro_negocio: "Construccion de edificios residenciales" })
    .where("id", "=", convertedOrgId)
    .execute();

  await db
    .insertInto("organization_people")
    .values({
      organization_id: convertedOrgId,
      dni: "42715983",
      nombres: "Daniel",
      apellido_paterno: "Gutierrez",
      apellido_materno: "Paredes",
      telefono: "987654321",
      email: "daniel.gutierrez@andes.pe",
      created_at: now - 29 * day,
      updated_at: now - 29 * day,
    })
    .execute();

  const legalRep = await db
    .selectFrom("organization_people")
    .select("id")
    .where("organization_id", "=", convertedOrgId)
    .where("dni", "=", "42715983")
    .executeTakeFirstOrThrow();

  await db
    .insertInto("organization_person_roles")
    .values({
      organization_person_id: legalRep.id,
      role: "LEGAL_REPRESENTATIVE",
      is_primary: 1,
      effective_from: now - 29 * day,
      effective_to: null,
    })
    .execute();

}
