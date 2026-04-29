import { randomUUIDv7 } from "bun";
import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { LeadSaleVenue } from "~/server/workflow/application/ports/sale-repository";

export type SaleVenueRow = Selectable<Database["workflow_sale_venues"]>;
export type NewSaleVenueRow = Insertable<Database["workflow_sale_venues"]>;
export type SaleVenueAccountRow = Selectable<
  Database["workflow_sale_venue_accounts"]
>;
export type NewSaleVenueAccountRow = Insertable<
  Database["workflow_sale_venue_accounts"]
>;

function toLeadSaleVenue(
  row: SaleVenueRow,
  accountRows: SaleVenueAccountRow[],
): LeadSaleVenue {
  const pen = accountRows.find((account) => account.currency === "PEN");
  if (!pen) {
    throw new Error(`Missing PEN account for sale venue ${row.id}`);
  }

  const usd = accountRows.find((account) => account.currency === "USD");

  const venue: LeadSaleVenue = {
    id: row.id,
    saleId: row.sale_id,
    leadId: row.lead_id,
    nombreComercial: row.nombre_comercial,
    cantidadPos: row.cantidad_pos,
    direccion: row.direccion,
    referencia: row.referencia,
    distrito: row.distrito,
    provincia: row.provincia,
    departamento: row.departamento,
    solesAccount: {
      banco: pen.bank,
      tipoCuenta: pen.account_type,
      nroCuenta: pen.account_number,
      cci: pen.cci ?? undefined,
      isSettlement: pen.is_settlement === 1,
    },
    createdAt: row.created_at,
    createdBy: row.created_by,
  };

  if (usd) {
    venue.dollarAccount = {
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
): Promise<Map<string, SaleVenueAccountRow[]>> {
  if (venueIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .selectFrom("workflow_sale_venue_accounts")
    .selectAll()
    .where("venue_id", "in", venueIds)
    .execute();

  const map = new Map<string, SaleVenueAccountRow[]>();
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

export function createSaleVenueRepo(db: DatabaseExecutor) {
  return {
    async insert(values: Omit<LeadSaleVenue, "id">): Promise<string> {
      const id = randomUUIDv7();
      await db
        .insertInto("workflow_sale_venues")
        .values({
          id,
          sale_id: values.saleId,
          lead_id: values.leadId,
          nombre_comercial: values.nombreComercial,
          cantidad_pos: values.cantidadPos,
          direccion: values.direccion,
          referencia: values.referencia,
          distrito: values.distrito,
          provincia: values.provincia,
          departamento: values.departamento,
          created_at: values.createdAt,
          created_by: values.createdBy,
        } satisfies NewSaleVenueRow)
        .executeTakeFirstOrThrow();

      const accountRows: NewSaleVenueAccountRow[] = [
        {
          id: randomUUIDv7(),
          venue_id: id,
          currency: "PEN",
          bank: values.solesAccount.banco,
          account_type: values.solesAccount.tipoCuenta,
          account_number: values.solesAccount.nroCuenta,
          cci: values.solesAccount.cci ?? null,
          is_settlement: values.solesAccount.isSettlement ? 1 : 0,
        },
      ];

      if (values.dollarAccount) {
        accountRows.push({
          id: randomUUIDv7(),
          venue_id: id,
          currency: "USD",
          bank: values.dollarAccount.banco,
          account_type: values.dollarAccount.tipoCuenta,
          account_number: values.dollarAccount.nroCuenta,
          cci: values.dollarAccount.cci ?? null,
          is_settlement: values.dollarAccount.isSettlement ? 1 : 0,
        });
      }

      await db
        .insertInto("workflow_sale_venue_accounts")
        .values(accountRows)
        .execute();

      return id;
    },

    async findById(id: string): Promise<LeadSaleVenue | undefined> {
      const row = await db
        .selectFrom("workflow_sale_venues")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      if (!row) return undefined;

      const accountRows = await db
        .selectFrom("workflow_sale_venue_accounts")
        .selectAll()
        .where("venue_id", "=", row.id)
        .execute();

      return toLeadSaleVenue(row, accountRows);
    },

    async listBySaleId(saleId: string): Promise<LeadSaleVenue[]> {
      const rows = await db
        .selectFrom("workflow_sale_venues")
        .selectAll()
        .where("sale_id", "=", saleId)
        .orderBy("created_at", "asc")
        .execute();

      const byVenueId = await listAccountsByVenueIds(
        db,
        rows.map((row) => row.id),
      );

      return rows.map((row) =>
        toLeadSaleVenue(row, byVenueId.get(row.id) ?? []),
      );
    },

    async listByLeadId(leadId: string): Promise<LeadSaleVenue[]> {
      const rows = await db
        .selectFrom("workflow_sale_venues")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("created_at", "asc")
        .execute();

      const byVenueId = await listAccountsByVenueIds(
        db,
        rows.map((row) => row.id),
      );

      return rows.map((row) =>
        toLeadSaleVenue(row, byVenueId.get(row.id) ?? []),
      );
    },
  };
}
