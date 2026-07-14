import { sql, type Transaction } from "kysely";

import type { Database } from "~/lib/db/types";
import type {
  MerchantSaleId,
  MerchantSalesReportId,
} from "~/server/shared/ids";

import { saleIdentityKey, type MappedGpvRow } from "../intake/contracts";
import { resolveRowMatch, type MatchContext, type RowMatch } from "./matching";

// Columns refreshed from every snapshot. The identity columns (merchant_id,
// product, serial_number) and provenance (first_seen_report_id, created_at) are
// intentionally excluded so reimport never rewrites them.
const REFRESHED_COLUMNS = [
  "ruc",
  "organization_id",
  "lead_id",
  "sold_at",
  "sale_month",
  "trade_name",
  "legal_name",
  "registered_seller_code",
  "registered_seller_name",
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
  "last_15d_gpv",
  "last_15d_trx",
  "last_seen_report_id",
  "updated_at",
] as const;

const SALES_CHUNK = 1000;
const METRICS_CHUNK = 4000;

export type SaleIdByIdentity = Map<string, MerchantSaleId>;

// Upserts the batch on the (merchant_id, product, coalesce(serial_number,''))
// identity and returns the sale id for each source row, whether inserted or
// updated, so metrics and staging can reference it.
export async function upsertSales(
  trx: Transaction<Database>,
  reportId: MerchantSalesReportId,
  rows: readonly MappedGpvRow[],
  ctx: MatchContext,
  now: Date,
): Promise<SaleIdByIdentity> {
  const deduped = dedupeByIdentity(rows);
  const idByIdentity: SaleIdByIdentity = new Map();

  for (const chunk of chunks(deduped, SALES_CHUNK)) {
    const values = chunk.map((row) =>
      toSaleValues(row, resolveRowMatch(ctx, row), reportId, now),
    );
    // eslint-disable-next-line no-await-in-loop
    const returned = await trx
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
            for (const col of REFRESHED_COLUMNS) {
              set[col] = eb.ref(`excluded.${col}`);
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

export async function insertMetrics(
  trx: Transaction<Database>,
  reportId: MerchantSalesReportId,
  rows: readonly MappedGpvRow[],
  saleIdByIdentity: SaleIdByIdentity,
): Promise<void> {
  const values = rows.flatMap((row) => {
    const saleId = saleIdByIdentity.get(
      saleIdentityKey(row.merchantId, row.product, row.serialNumber),
    );
    if (!saleId) return [];
    return row.metrics.map((metric) => ({
      report_id: reportId,
      merchant_sale_id: saleId,
      month: metric.month,
      month_offset: metric.monthOffset,
      gpv: metric.gpv,
      trx: metric.trx,
    }));
  });

  for (const chunk of chunks(values, METRICS_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    await trx.insertInto("merchant_sale_metrics").values(chunk).execute();
  }
}

function toSaleValues(
  row: MappedGpvRow,
  match: RowMatch,
  reportId: MerchantSalesReportId,
  now: Date,
) {
  return {
    merchant_id: row.merchantId,
    serial_number: row.serialNumber,
    ruc: row.ruc,
    organization_id: match.organizationId,
    lead_id: match.leadId,
    product: row.product,
    sold_at: row.soldAt,
    sale_month: row.saleMonth,
    trade_name: row.tradeName,
    legal_name: row.legalName,
    registered_seller_code: row.registeredSellerCode,
    registered_seller_name: row.registeredSellerName,
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
    last_15d_gpv: row.last15dGpv,
    last_15d_trx: row.last15dTrx,
    first_seen_report_id: reportId,
    last_seen_report_id: reportId,
    created_at: now,
    updated_at: now,
  };
}

function dedupeByIdentity(rows: readonly MappedGpvRow[]): MappedGpvRow[] {
  // A multi-row upsert cannot touch the same conflict target twice, so keep the
  // last occurrence when a file repeats an identity (it should not, but be safe).
  const byKey = new Map<string, MappedGpvRow>();
  for (const row of rows) {
    byKey.set(
      saleIdentityKey(row.merchantId, row.product, row.serialNumber),
      row,
    );
  }
  return [...byKey.values()];
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}
