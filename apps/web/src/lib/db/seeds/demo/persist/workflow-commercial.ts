import type { Kysely } from "kysely";

import type { OrganizationId } from "~/server/shared/ids";

import type { Database } from "../../../types";
import { BO1, EXEC_DANIELA, type OrganizationSeedKey } from "../scenario";
import type { WorkflowCommercialIds, WorkflowLeadIds } from "./history-events";

export async function persistWorkflowCommercialData(
  db: Kysely<Database>,
  now: number,
  day: number,
  leadIds: WorkflowLeadIds,
  commercialIds: WorkflowCommercialIds,
  getOrganizationId: (key: OrganizationSeedKey) => OrganizationId,
): Promise<void> {
  const { idQuoted, idForSale, idConverted } = leadIds;
  const { qidQuoted, qidForSale, qidConverted, vidConverted } = commercialIds;
  await db
    .insertInto("workflow_rate_proposals")
    .values([
      {
        id: qidQuoted,
        lead_id: idQuoted,
        round: 1,
        payback_pricing: 1.2,
        proposed_debit_rate: 0.9,
        proposed_credit_rate: 2.3,
        proposed_foreign_rate: 1.7,
        fee: 18.0,
        currency: "PEN",
        proposed_by: BO1,
        proposed_at: new Date(now - 10 * day),
        outcome: "pending",
        decided_at: null,
      },
      {
        id: qidForSale,
        lead_id: idForSale,
        round: 1,
        payback_pricing: 1.15,
        proposed_debit_rate: 0.85,
        proposed_credit_rate: 2.2,
        proposed_foreign_rate: 1.6,
        fee: 20.0,
        currency: "PEN",
        proposed_by: BO1,
        proposed_at: new Date(now - 18 * day),
        outcome: "accepted",
        decided_at: new Date(now - 16 * day),
      },
      {
        id: qidConverted,
        lead_id: idConverted,
        round: 1,
        payback_pricing: 1.25,
        proposed_debit_rate: 0.95,
        proposed_credit_rate: 2.5,
        proposed_foreign_rate: 1.8,
        fee: 15.0,
        currency: "PEN",
        proposed_by: BO1,
        proposed_at: new Date(now - 27 * day),
        outcome: "accepted",
        decided_at: new Date(now - 25 * day),
      },
    ])
    .onConflict((oc) =>
      oc.column("id").doUpdateSet((eb) => ({
        lead_id: eb.ref("excluded.lead_id"),
        round: eb.ref("excluded.round"),
        payback_pricing: eb.ref("excluded.payback_pricing"),
        proposed_debit_rate: eb.ref("excluded.proposed_debit_rate"),
        proposed_credit_rate: eb.ref("excluded.proposed_credit_rate"),
        proposed_foreign_rate: eb.ref("excluded.proposed_foreign_rate"),
        fee: eb.ref("excluded.fee"),
        currency: eb.ref("excluded.currency"),
        proposed_by: eb.ref("excluded.proposed_by"),
        proposed_at: eb.ref("excluded.proposed_at"),
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
        trade_name: "Andes Miraflores",
        pos_quantity: 3,
        link_url: null,
        online_url: null,
        online_collection_mode: null,
        address: "AV. BENAVIDES NRO. 1855",
        address_reference: "Frente al parque central",
        district: "MIRAFLORES",
        province: "LIMA",
        department: "LIMA",
        created_at: new Date(now - 22 * day),
        created_by: EXEC_DANIELA,
      },
    ])
    .onConflict((oc) =>
      oc.column("id").doUpdateSet((eb) => ({
        lead_id: eb.ref("excluded.lead_id"),
        trade_name: eb.ref("excluded.trade_name"),
        pos_quantity: eb.ref("excluded.pos_quantity"),
        link_url: eb.ref("excluded.link_url"),
        online_url: eb.ref("excluded.online_url"),
        online_collection_mode: eb.ref("excluded.online_collection_mode"),
        address: eb.ref("excluded.address"),
        address_reference: eb.ref("excluded.address_reference"),
        district: eb.ref("excluded.district"),
        province: eb.ref("excluded.province"),
        department: eb.ref("excluded.department"),
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
        is_settlement: true,
      },
      {
        id: "demo-workflow-venue-account-usd",
        venue_id: vidConverted,
        currency: "USD",
        bank: "BBVA",
        account_type: "AHORROS",
        account_number: "0011-0245-9988776655",
        cci: "01124500998877665522",
        is_settlement: false,
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
    .insertInto("workflow_lead_digital_policy")
    .values([
      {
        lead_id: idConverted,
        link_scope: "none",
        link_url: null,
        online_scope: "none",
        online_url: null,
        online_collection_mode: null,
        updated_at: new Date(now - 28 * day),
        updated_by: EXEC_DANIELA,
      },
    ])
    .onConflict((oc) =>
      oc.column("lead_id").doUpdateSet((eb) => ({
        link_scope: eb.ref("excluded.link_scope"),
        link_url: eb.ref("excluded.link_url"),
        online_scope: eb.ref("excluded.online_scope"),
        online_url: eb.ref("excluded.online_url"),
        online_collection_mode: eb.ref("excluded.online_collection_mode"),
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
      names: "Daniel",
      first_surname: "Gutierrez",
      second_surname: "Paredes",
      email: "daniel.gutierrez@andes.pe",
      created_at: new Date(now - 29 * day),
      updated_at: new Date(now - 29 * day),
    })
    .onConflict((oc) =>
      oc.column("dni").doUpdateSet({
        names: "Daniel",
        first_surname: "Gutierrez",
        second_surname: "Paredes",
        email: "daniel.gutierrez@andes.pe",
        updated_at: new Date(now - 29 * day),
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
    .set({ line_of_business: "Construccion de edificios residenciales" })
    .where("id", "=", convertedOrgId)
    .execute();

  await db
    .insertInto("organization_people")
    .values({
      person_id: legalRepPerson.id,
      organization_id: convertedOrgId,
      phone: "987654321",
      email: "daniel.gutierrez@andes.pe",
      created_at: new Date(now - 29 * day),
      updated_at: new Date(now - 29 * day),
    })
    .onConflict((oc) =>
      oc.columns(["organization_id", "person_id"]).doUpdateSet((eb) => ({
        phone: eb.ref("excluded.phone"),
        email: eb.ref("excluded.email"),
        updated_at: eb.ref("excluded.updated_at"),
      })),
    )
    .execute();

  const legalRep = await db
    .selectFrom("organization_people")
    .innerJoin("people", "people.id", "organization_people.person_id")
    .select("organization_people.id as id")
    .where("organization_people.organization_id", "=", convertedOrgId)
    .where("people.dni", "=", "42715983")
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
        is_primary: true,
        effective_from: new Date(now - 29 * day),
        effective_to: null,
      })
      .execute();
  }
}
