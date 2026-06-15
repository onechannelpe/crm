import type { Kysely } from "kysely";

import type { OrganizationId } from "~/server/shared/ids";

import type { Database } from "../../../types";
import { BO1, EXEC_DANIELA, type OrganizationSeedKey } from "../scenario";
import type { WorkflowArtifactIds, WorkflowLeadIds } from "./history-events";

export async function persistWorkflowCommercialData(
  db: Kysely<Database>,
  now: number,
  day: number,
  leadIds: WorkflowLeadIds,
  artifacts: WorkflowArtifactIds,
  getOrganizationId: (key: OrganizationSeedKey) => OrganizationId,
): Promise<void> {
  const { idQuoted, idForSale, idConverted } = leadIds;
  const { qidQuoted, qidForSale, qidConverted, vidConverted } = artifacts;
  await db
    .insertInto("workflow_rate_proposals")
    .values([
      {
        id: qidQuoted,
        lead_id: idQuoted,
        round: 1,
        payback_pricing: 1.2,
        tarifa_debito: 0.9,
        tarifa_credito: 2.3,
        tarifa_foraneo: 1.7,
        fee: 18.0,
        moneda: "PEN",
        proposed_by: BO1,
        proposed_at: now - 10 * day,
        validity_days: 14,
        expires_at: now + 4 * day,
        outcome: "pending",
        decided_at: null,
      },
      {
        id: qidForSale,
        lead_id: idForSale,
        round: 1,
        payback_pricing: 1.15,
        tarifa_debito: 0.85,
        tarifa_credito: 2.2,
        tarifa_foraneo: 1.6,
        fee: 20.0,
        moneda: "PEN",
        proposed_by: BO1,
        proposed_at: now - 18 * day,
        validity_days: 7,
        expires_at: now - 11 * day,
        outcome: "accepted",
        decided_at: now - 16 * day,
      },
      {
        id: qidConverted,
        lead_id: idConverted,
        round: 1,
        payback_pricing: 1.25,
        tarifa_debito: 0.95,
        tarifa_credito: 2.5,
        tarifa_foraneo: 1.8,
        fee: 15.0,
        moneda: "PEN",
        proposed_by: BO1,
        proposed_at: now - 27 * day,
        validity_days: 7,
        expires_at: now - 20 * day,
        outcome: "accepted",
        decided_at: now - 25 * day,
      },
    ])
    .onConflict((oc) =>
      oc.column("id").doUpdateSet((eb) => ({
        lead_id: eb.ref("excluded.lead_id"),
        round: eb.ref("excluded.round"),
        payback_pricing: eb.ref("excluded.payback_pricing"),
        tarifa_debito: eb.ref("excluded.tarifa_debito"),
        tarifa_credito: eb.ref("excluded.tarifa_credito"),
        tarifa_foraneo: eb.ref("excluded.tarifa_foraneo"),
        fee: eb.ref("excluded.fee"),
        moneda: eb.ref("excluded.moneda"),
        proposed_by: eb.ref("excluded.proposed_by"),
        proposed_at: eb.ref("excluded.proposed_at"),
        validity_days: eb.ref("excluded.validity_days"),
        expires_at: eb.ref("excluded.expires_at"),
        outcome: eb.ref("excluded.outcome"),
        decided_at: eb.ref("excluded.decided_at"),
      })),
    )
    .execute();

  await db
    .insertInto("workflow_lead_venues")
    .values([
      {
        id: vidConverted,
        lead_id: idConverted,
        nombre_comercial: "Andes Miraflores",
        pos_quantity: 3,
        link_url: null,
        online_url: null,
        online_modalidad: null,
        direccion: "AV. BENAVIDES NRO. 1855",
        referencia: "Frente al parque central",
        distrito: "MIRAFLORES",
        provincia: "LIMA",
        departamento: "LIMA",
        created_at: now - 22 * day,
        created_by: EXEC_DANIELA,
      },
    ])
    .onConflict((oc) =>
      oc.column("id").doUpdateSet((eb) => ({
        lead_id: eb.ref("excluded.lead_id"),
        nombre_comercial: eb.ref("excluded.nombre_comercial"),
        pos_quantity: eb.ref("excluded.pos_quantity"),
        link_url: eb.ref("excluded.link_url"),
        online_url: eb.ref("excluded.online_url"),
        online_modalidad: eb.ref("excluded.online_modalidad"),
        direccion: eb.ref("excluded.direccion"),
        referencia: eb.ref("excluded.referencia"),
        distrito: eb.ref("excluded.distrito"),
        provincia: eb.ref("excluded.provincia"),
        departamento: eb.ref("excluded.departamento"),
        created_at: eb.ref("excluded.created_at"),
        created_by: eb.ref("excluded.created_by"),
      })),
    )
    .execute();

  await db
    .insertInto("workflow_lead_venue_accounts")
    .values([
      {
        id: "demo-workflow-venue-account-pen",
        venue_id: vidConverted,
        currency: "PEN",
        bank: "BCP",
        account_type: "CORRIENTE",
        account_number: "194-12345678-0-21",
        cci: null,
        is_settlement: 1,
      },
      {
        id: "demo-workflow-venue-account-usd",
        venue_id: vidConverted,
        currency: "USD",
        bank: "BBVA",
        account_type: "AHORROS",
        account_number: "0011-0245-9988776655",
        cci: "01124500998877665522",
        is_settlement: 0,
      },
    ])
    .onConflict((oc) =>
      oc.column("id").doUpdateSet((eb) => ({
        venue_id: eb.ref("excluded.venue_id"),
        currency: eb.ref("excluded.currency"),
        bank: eb.ref("excluded.bank"),
        account_type: eb.ref("excluded.account_type"),
        account_number: eb.ref("excluded.account_number"),
        cci: eb.ref("excluded.cci"),
        is_settlement: eb.ref("excluded.is_settlement"),
      })),
    )
    .execute();

  await db
    .insertInto("workflow_lead_profiles")
    .values([
      {
        lead_id: idConverted,
        proveedor_actual: "BBVA",
        tasa_actual: 2.8,
        gpv: 85_000.0,
        ticket: 245.5,
        abono_bank: "INTERBANK",
        pos_total: 4,
        link_scope: "none",
        link_url: null,
        online_scope: "none",
        online_url: null,
        online_modalidad: null,
        updated_at: now - 28 * day,
        updated_by: EXEC_DANIELA,
      },
    ])
    .onConflict((oc) =>
      oc.column("lead_id").doUpdateSet((eb) => ({
        proveedor_actual: eb.ref("excluded.proveedor_actual"),
        tasa_actual: eb.ref("excluded.tasa_actual"),
        gpv: eb.ref("excluded.gpv"),
        ticket: eb.ref("excluded.ticket"),
        abono_bank: eb.ref("excluded.abono_bank"),
        pos_total: eb.ref("excluded.pos_total"),
        link_scope: eb.ref("excluded.link_scope"),
        link_url: eb.ref("excluded.link_url"),
        online_scope: eb.ref("excluded.online_scope"),
        online_url: eb.ref("excluded.online_url"),
        online_modalidad: eb.ref("excluded.online_modalidad"),
        updated_at: eb.ref("excluded.updated_at"),
        updated_by: eb.ref("excluded.updated_by"),
      })),
    )
    .execute();

  const convertedOrgId = getOrganizationId("converted");

  await db
    .insertInto("people")
    .values({
      dni: "42715983",
      full_name: "Daniel Gutierrez Paredes",
      email: "daniel.gutierrez@andes.pe",
      created_at: now - 29 * day,
      updated_at: now - 29 * day,
    })
    .onConflict((oc) =>
      oc.column("dni").doUpdateSet({
        full_name: "Daniel Gutierrez Paredes",
        email: "daniel.gutierrez@andes.pe",
        updated_at: now - 29 * day,
      }),
    )
    .execute();
  const legalRepPerson = await db
    .selectFrom("people")
    .select("id")
    .where("dni", "=", "42715983")
    .executeTakeFirstOrThrow();

  await db
    .updateTable("organizations")
    .set({ giro_negocio: "Construccion de edificios residenciales" })
    .where("id", "=", convertedOrgId)
    .execute();

  await db
    .insertInto("organization_people")
    .values({
      person_id: legalRepPerson.id,
      organization_id: convertedOrgId,
      dni: "42715983",
      nombres: "Daniel",
      apellido_paterno: "Gutierrez",
      apellido_materno: "Paredes",
      telefono: "987654321",
      email: "daniel.gutierrez@andes.pe",
      last_contacted_at: null,
      last_contacted_by_user_id: null,
      cooldown_until: null,
      created_at: now - 29 * day,
      updated_at: now - 29 * day,
    })
    .onConflict((oc) =>
      oc.columns(["organization_id", "dni"]).doUpdateSet((eb) => ({
        nombres: eb.ref("excluded.nombres"),
        apellido_paterno: eb.ref("excluded.apellido_paterno"),
        apellido_materno: eb.ref("excluded.apellido_materno"),
        telefono: eb.ref("excluded.telefono"),
        email: eb.ref("excluded.email"),
        updated_at: eb.ref("excluded.updated_at"),
      })),
    )
    .execute();

  const legalRep = await db
    .selectFrom("organization_people")
    .select("id")
    .where("organization_id", "=", convertedOrgId)
    .where("dni", "=", "42715983")
    .executeTakeFirstOrThrow();

  const existingLegalRepRole = await db
    .selectFrom("organization_person_roles")
    .select("id")
    .where("organization_person_id", "=", legalRep.id)
    .where("role", "=", "LEGAL_REPRESENTATIVE")
    .where("effective_to", "is", null)
    .executeTakeFirst();
  if (!existingLegalRepRole) {
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
}
