import { randomUUIDv7 } from "bun";
import type { Insertable, Selectable } from "kysely";

import type { SaleVenueAccount } from "~/contracts/workflow/primitives";
import type { CollectionMode } from "~/contracts/workflow/vocabulary";
import type { DomainError } from "~/domain/errors";
import {
  WorkflowVenueId,
  type UserId,
  type WorkflowLeadId,
} from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { Database } from "~/server/platform/database/types";
import { Ok, type Result } from "~/shared/result";

export type LeadVenue = {
  id: WorkflowVenueId;
  leadId: WorkflowLeadId;
  tradeName: string;
  posQuantity: number;
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
  address: string;
  addressReference: string;
  district: string;
  province: string;
  department: string;
  solesAccount?: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
  createdAt: Date;
  createdBy: UserId;
};

export type LeadVenueInsert = Omit<
  LeadVenue,
  "id" | "solesAccount" | "dollarAccount"
>;

export type LeadVenueUpdate = Omit<
  LeadVenue,
  "id" | "leadId" | "solesAccount" | "dollarAccount" | "createdAt" | "createdBy"
>;

export type LeadVenueAccounts = {
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
};

export type LeadVenueRepository = {
  insert(values: LeadVenueInsert): Promise<WorkflowVenueId>;
  update(venueId: WorkflowVenueId, values: LeadVenueUpdate): Promise<void>;
  addAccounts(
    venueId: WorkflowVenueId,
    accounts: LeadVenueAccounts,
    now: Date,
  ): Promise<void>;
  findById(
    id: WorkflowVenueId,
  ): Promise<Result<LeadVenue | undefined, DomainError>>;
  listByLeadId(
    leadId: WorkflowLeadId,
  ): Promise<Result<LeadVenue[], DomainError>>;
  countByLeadId(leadId: WorkflowLeadId): Promise<number>;
  countWithAccounts(leadId: WorkflowLeadId): Promise<number>;
};

type LeadVenueRow = Selectable<Database["workflow_lead_venues"]>;
type NewLeadVenueRow = Insertable<Database["workflow_lead_venues"]>;
type LeadVenueAccountRow = Selectable<Database["workflow_lead_venue_accounts"]>;
type NewLeadVenueAccountRow = Insertable<
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
    tradeName: row.trade_name,
    posQuantity: row.pos_quantity,
    linkUrl: row.link_url,
    onlineUrl: row.online_url,
    onlineCollectionMode: row.online_collection_mode,
    address: row.address,
    addressReference: row.address_reference,
    district: row.district,
    province: row.province,
    department: row.department,
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
      isSettlement: pen.is_settlement,
    };
  }

  if (usd) {
    venue.dollarAccount = {
      currency: "USD",
      banco: usd.bank,
      tipoCuenta: usd.account_type,
      nroCuenta: usd.account_number,
      cci: usd.cci ?? undefined,
      isSettlement: usd.is_settlement,
    };
  }

  return venue;
}

async function listAccountsByVenueIds(
  db: DatabaseExecutor,
  venueIds: WorkflowVenueId[],
): Promise<Map<WorkflowVenueId, LeadVenueAccountRow[]>> {
  if (venueIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .selectFrom("workflow_lead_venue_accounts")
    .selectAll()
    .where("venue_id", "in", venueIds)
    .execute();

  const map = new Map<WorkflowVenueId, LeadVenueAccountRow[]>();
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
    async insert(values: LeadVenueInsert): Promise<WorkflowVenueId> {
      const id = WorkflowVenueId.trust(randomUUIDv7());
      await db
        .insertInto("workflow_lead_venues")
        .values({
          id,
          lead_id: values.leadId,
          trade_name: values.tradeName,
          pos_quantity: values.posQuantity,
          link_url: values.linkUrl,
          online_url: values.onlineUrl,
          online_collection_mode: values.onlineCollectionMode,
          address: values.address,
          address_reference: values.addressReference,
          district: values.district,
          province: values.province,
          department: values.department,
          created_at: values.createdAt,
          created_by: values.createdBy,
        } satisfies NewLeadVenueRow)
        .executeTakeFirstOrThrow();

      return id;
    },

    async addAccounts(
      venueId: WorkflowVenueId,
      accounts: LeadVenueAccounts,
      _now: Date,
    ): Promise<void> {
      const accountRows: NewLeadVenueAccountRow[] = [
        {
          venue_id: venueId,
          currency: "PEN",
          bank: accounts.solesAccount.banco,
          account_type: accounts.solesAccount.tipoCuenta,
          account_number: accounts.solesAccount.nroCuenta,
          cci: accounts.solesAccount.cci ?? null,
          is_settlement: accounts.solesAccount.isSettlement,
        },
      ];

      if (accounts.dollarAccount) {
        accountRows.push({
          venue_id: venueId,
          currency: "USD",
          bank: accounts.dollarAccount.banco,
          account_type: accounts.dollarAccount.tipoCuenta,
          account_number: accounts.dollarAccount.nroCuenta,
          cci: accounts.dollarAccount.cci ?? null,
          is_settlement: accounts.dollarAccount.isSettlement,
        });
      }

      await db
        .insertInto("workflow_lead_venue_accounts")
        .values(accountRows)
        .execute();
    },

    async update(
      venueId: WorkflowVenueId,
      values: LeadVenueUpdate,
    ): Promise<void> {
      await db
        .updateTable("workflow_lead_venues")
        .set({
          trade_name: values.tradeName,
          pos_quantity: values.posQuantity,
          link_url: values.linkUrl,
          online_url: values.onlineUrl,
          online_collection_mode: values.onlineCollectionMode,
          address: values.address,
          address_reference: values.addressReference,
          district: values.district,
          province: values.province,
          department: values.department,
        })
        .where("id", "=", venueId)
        .executeTakeFirstOrThrow();
    },

    async findById(
      id: WorkflowVenueId,
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
      leadId: WorkflowLeadId,
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

    async countByLeadId(leadId: WorkflowLeadId): Promise<number> {
      const result = await db
        .selectFrom("workflow_lead_venues")
        .select((eb) => eb.fn.count("id").as("count"))
        .where("lead_id", "=", leadId)
        .executeTakeFirstOrThrow();

      return Number(result.count);
    },

    async countWithAccounts(leadId: WorkflowLeadId): Promise<number> {
      const result = await db
        .selectFrom("workflow_lead_venue_accounts as a")
        .innerJoin("workflow_lead_venues as v", "v.id", "a.venue_id")
        .select((eb) =>
          eb.fn.count<string>("a.venue_id").distinct().as("count"),
        )
        .where("v.lead_id", "=", leadId)
        .executeTakeFirstOrThrow();

      return Number(result.count);
    },
  };
}
