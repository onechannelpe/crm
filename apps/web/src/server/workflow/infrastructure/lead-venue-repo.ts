import { randomUUIDv7 } from "bun";
import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import type {
  LeadVenue,
  LeadVenueAccounts,
  LeadVenueInsert,
} from "~/server/workflow/application/ports/sale-repository";

export type LeadVenueRow = Selectable<Database["workflow_lead_venues"]>;
export type NewLeadVenueRow = Insertable<Database["workflow_lead_venues"]>;
export type LeadVenueAccountRow = Selectable<
  Database["workflow_lead_venue_accounts"]
>;
export type NewLeadVenueAccountRow = Insertable<
  Database["workflow_lead_venue_accounts"]
>;

function toLeadVenue(
  row: LeadVenueRow,
  accountRows: LeadVenueAccountRow[],
): LeadVenue {
  const pen = accountRows.find((a) => a.currency === "PEN");
  const usd = accountRows.find((a) => a.currency === "USD");

  const venue: LeadVenue = {
    id: row.id,
    leadId: row.lead_id,
    nombreComercial: row.nombre_comercial,
    posQuantity: row.pos_quantity,
    linkUrl: row.link_url,
    onlineUrl: row.online_url,
    onlineModalidad: row.online_modalidad,
    direccion: row.direccion,
    referencia: row.referencia,
    distrito: row.distrito,
    provincia: row.provincia,
    departamento: row.departamento,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };

  if (pen) {
    venue.solesAccount = {
      currency: "PEN",
      banco: pen.bank,
      tipoCuenta: pen.account_type,
      nroCuenta: pen.account_number,
      cci: pen.cci ?? undefined,
      isSettlement: pen.is_settlement === 1,
    };
  }

  if (usd) {
    venue.dollarAccount = {
      currency: "USD",
      banco: usd.bank,
      tipoCuenta: usd.account_type,
      nroCuenta: usd.account_number,
      cci: usd.cci ?? undefined,
      isSettlement: usd.is_settlement === 1,
    };
  }

  return venue;
}

async function listAccountsByVenueIds(
  db: DatabaseExecutor,
  venueIds: string[],
): Promise<Map<string, LeadVenueAccountRow[]>> {
  if (venueIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .selectFrom("workflow_lead_venue_accounts")
    .selectAll()
    .where("venue_id", "in", venueIds)
    .execute();

  const map = new Map<string, LeadVenueAccountRow[]>();
  for (const row of rows) {
    const bucket = map.get(row.venue_id);
    if (bucket) {
      bucket.push(row);
      continue;
    }
    map.set(row.venue_id, [row]);
  }

  return map;
}

export function createLeadVenueRepo(db: DatabaseExecutor) {
  return {
    async insert(values: LeadVenueInsert): Promise<string> {
      const id = randomUUIDv7();
      await db
        .insertInto("workflow_lead_venues")
        .values({
          id,
          lead_id: values.leadId,
          nombre_comercial: values.nombreComercial,
          pos_quantity: values.posQuantity,
          link_url: values.linkUrl,
          online_url: values.onlineUrl,
          online_modalidad: values.onlineModalidad,
          direccion: values.direccion,
          referencia: values.referencia,
          distrito: values.distrito,
          provincia: values.provincia,
          departamento: values.departamento,
          created_at: values.createdAt,
          created_by: values.createdBy,
        } satisfies NewLeadVenueRow)
        .executeTakeFirstOrThrow();

      return id;
    },

    async addAccounts(
      venueId: string,
      accounts: LeadVenueAccounts,
      _now: number,
    ): Promise<void> {
      const accountRows: NewLeadVenueAccountRow[] = [
        {
          id: randomUUIDv7(),
          venue_id: venueId,
          currency: "PEN",
          bank: accounts.solesAccount.banco,
          account_type: accounts.solesAccount.tipoCuenta,
          account_number: accounts.solesAccount.nroCuenta,
          cci: accounts.solesAccount.cci ?? null,
          is_settlement: accounts.solesAccount.isSettlement ? 1 : 0,
        },
      ];

      if (accounts.dollarAccount) {
        accountRows.push({
          id: randomUUIDv7(),
          venue_id: venueId,
          currency: "USD",
          bank: accounts.dollarAccount.banco,
          account_type: accounts.dollarAccount.tipoCuenta,
          account_number: accounts.dollarAccount.nroCuenta,
          cci: accounts.dollarAccount.cci ?? null,
          is_settlement: accounts.dollarAccount.isSettlement ? 1 : 0,
        });
      }

      await db
        .insertInto("workflow_lead_venue_accounts")
        .values(accountRows)
        .execute();
    },

    async findById(
      id: string,
    ): Promise<Result<LeadVenue | undefined, DomainError>> {
      const row = await db
        .selectFrom("workflow_lead_venues")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      if (!row) return Ok(undefined);

      const accountRows = await db
        .selectFrom("workflow_lead_venue_accounts")
        .selectAll()
        .where("venue_id", "=", row.id)
        .execute();

      return Ok(toLeadVenue(row, accountRows));
    },

    async listByLeadId(
      leadId: string,
    ): Promise<Result<LeadVenue[], DomainError>> {
      const rows = await db
        .selectFrom("workflow_lead_venues")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("created_at", "asc")
        .execute();

      const byVenueId = await listAccountsByVenueIds(
        db,
        rows.map((row) => row.id),
      );

      return Ok(
        rows.map((row) => toLeadVenue(row, byVenueId.get(row.id) ?? [])),
      );
    },

    async countWithAccounts(leadId: string): Promise<number> {
      const venueRows = await db
        .selectFrom("workflow_lead_venues")
        .select("id")
        .where("lead_id", "=", leadId)
        .execute();

      if (venueRows.length === 0) return 0;

      const venueIds = venueRows.map((r) => r.id);
      const accountRows = await db
        .selectFrom("workflow_lead_venue_accounts")
        .select("venue_id")
        .where("venue_id", "in", venueIds)
        .execute();

      const uniqueVenueIds = new Set(accountRows.map((r) => r.venue_id));
      return uniqueVenueIds.size;
    },
  };
}
