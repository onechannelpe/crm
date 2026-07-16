import { sql } from "kysely";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { MerchantReportId, MerchantSaleId } from "~/server/shared/ids";

import { saleIdentityKey } from "../intake/sale-identity";
import type { SourceRow } from "../intake/types";
import { chunks } from "./chunks";

// Snapshot refreshes never move a sale between its identity or sale month.
const REFRESHED_COLUMNS = [
  "ruc",
  "sold_at",
  "trade_name",
  "legal_name",
  "culqi_user_code",
  "culqi_user_name",
  "mesa",
  "channel",
  "subchannel",
  "offer_amount",
  "promotion",
  "client_type",
  "stock_type",
  "trial_at",
  "activated_at",
  "last_transaction_at",
  "m0_plus_15d_gpv",
  "m0_plus_15d_trx",
  "last_seen_report_id",
  "updated_at",
] as const;

const SALES_CHUNK = 1000;

export type SaleIdByIdentity = Map<string, MerchantSaleId>;

export async function upsertSales(
  db: DatabaseExecutor,
  reportId: MerchantReportId,
  rows: readonly SourceRow[],
  now: Date,
): Promise<SaleIdByIdentity> {
  const idByIdentity: SaleIdByIdentity = new Map();

  for (const chunk of chunks(dedupeByIdentity(rows), SALES_CHUNK)) {
    const values = chunk.map((row) => toSaleValues(row, reportId, now));
    // eslint-disable-next-line no-await-in-loop
    const returned = await db
      .insertInto("merchant_sales")
      .values(values)
      .onConflict((oc) =>
        oc
          // Kysely wraps the index expression in parentheses, so the target
          // must not include its own outer parens (that yields ((...)), a row
          // constructor Postgres rejects).
          .expression(sql`merchant_id, product, coalesce(serial_number, '')`)
          .doUpdateSet((eb) => {
            const set: Record<string, unknown> = {};
            for (const column of REFRESHED_COLUMNS) {
              set[column] = eb.ref(`excluded.${column}`);
            }
            return set;
          }),
      )
      .returning(["id", "merchant_id", "product", "serial_number"])
      .execute();

    for (const sale of returned) {
      idByIdentity.set(
        saleIdentityKey(sale.merchant_id, sale.product, sale.serial_number),
        sale.id,
      );
    }
  }

  return idByIdentity;
}

function toSaleValues(row: SourceRow, reportId: MerchantReportId, now: Date) {
  return {
    merchant_id: row.merchantId,
    product: row.product,
    serial_number: row.serialNumber,
    ruc: row.ruc,
    sold_at: row.soldAt,
    sale_month: row.saleMonth,
    trade_name: row.tradeName,
    legal_name: row.legalName,
    culqi_user_code: row.culqiUserCode,
    culqi_user_name: row.culqiUserName,
    mesa: row.mesa,
    channel: row.channel,
    subchannel: row.subchannel,
    offer_amount: row.offerAmount,
    promotion: row.promotion,
    client_type: row.clientType,
    stock_type: row.stockType,
    trial_at: row.trialAt,
    activated_at: row.activatedAt,
    last_transaction_at: row.lastTransactionAt,
    m0_plus_15d_gpv: row.m0Plus15dGpv,
    m0_plus_15d_trx: row.m0Plus15dTrx,
    first_seen_report_id: reportId,
    last_seen_report_id: reportId,
    created_at: now,
    updated_at: now,
  };
}

function dedupeByIdentity(rows: readonly SourceRow[]): SourceRow[] {
  // A multi-row upsert cannot touch one conflict target twice.
  const byKey = new Map<string, SourceRow>();
  for (const row of rows) {
    byKey.set(
      saleIdentityKey(row.merchantId, row.product, row.serialNumber),
      row,
    );
  }
  return [...byKey.values()];
}
