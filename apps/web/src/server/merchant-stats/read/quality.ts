import type { Expression, ExpressionBuilder, SqlBool } from "kysely";

import { QUALITY_ISSUE_COPY } from "~/contracts/merchant-stats/quality-copy";
import type {
  Page,
  QualityRow,
  QualitySummary,
} from "~/contracts/merchant-stats/views";
import type { QualityIssue } from "~/contracts/merchant-stats/vocabulary";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { Database } from "~/server/platform/database/types";

import { monthFromStorageDate } from "../storage-month";
import { displayName } from "./names";
import { targetAsOfMonth } from "./target-as-of";

type SaleContext = ExpressionBuilder<
  Database & { s: Database["merchant_sales"] },
  "s"
>;

function fulfilledSerials(eb: SaleContext) {
  return eb
    .selectFrom("lead_fulfillment_units as unit")
    .innerJoin("lead_fulfillment_orders as ord", "ord.id", "unit.order_id")
    .innerJoin("workflow_leads as lead", "lead.id", "ord.lead_id")
    .innerJoin("organizations as org", "org.id", "lead.organization_id")
    .select("unit.id")
    .whereRef("org.ruc", "=", "s.ruc");
}

// Flag a serial only when the RUC has fulfillment serials to contradict it.
function serialMismatched(eb: SaleContext): Expression<SqlBool> {
  return eb.and([
    eb("s.serial_number", "is not", null),
    eb.not(
      eb.exists(
        fulfilledSerials(eb).whereRef(
          "unit.serial_number",
          "=",
          "s.serial_number",
        ),
      ),
    ),
    eb.exists(fulfilledSerials(eb)),
  ]);
}

export async function getQualitySummary(
  db: DatabaseExecutor,
): Promise<QualitySummary> {
  const [noOwner, noTarget, serialMismatch] = await Promise.all([
    db
      .selectFrom("merchant_monthly_gpv as m")
      .leftJoin("merchant_month_credit as credit", (join) =>
        join
          .onRef("credit.ruc", "=", "m.ruc")
          .onRef("credit.month", "=", "m.month"),
      )
      .where("credit.ruc", "is", null)
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .executeTakeFirst(),
    db
      .selectFrom("merchant_monthly_gpv as m")
      .leftJoinLateral(targetAsOfMonth, (join) => join.onTrue())
      .where("t.monthly_target_gpv", "is", null)
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .executeTakeFirst(),
    db
      .selectFrom("merchant_sales as s")
      .where((eb) => serialMismatched(eb))
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .executeTakeFirst(),
  ]);

  const counts: QualitySummary = {
    no_owner: noOwner?.count ?? 0,
    no_target: 0,
    serial_mismatch: 0,
  };

  counts.no_target = noTarget?.count ?? 0;
  counts.serial_mismatch = serialMismatch?.count ?? 0;

  return counts;
}

export async function getQualityRows(
  db: DatabaseExecutor,
  issue: QualityIssue,
  page: Page,
): Promise<QualityRow[]> {
  if (issue === "serial_mismatch") {
    return serialMismatchRows(db, page);
  }
  if (issue === "no_target") {
    return noTargetRows(db, page);
  }
  return noOwnerRows(db, page);
}

async function noOwnerRows(
  db: DatabaseExecutor,
  page: Page,
): Promise<QualityRow[]> {
  const rows = await db
    .selectFrom("merchant_monthly_gpv as m")
    .leftJoin("merchant_month_credit as a", (join) =>
      join.onRef("a.ruc", "=", "m.ruc").onRef("a.month", "=", "m.month"),
    )
    .leftJoin("organizations as o", "o.ruc", "m.ruc")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("merchant_sales as ms")
          .select(["ms.trade_name", "ms.culqi_user_name"])
          .whereRef("ms.ruc", "=", "m.ruc")
          .orderBy("ms.sold_at", "desc")
          .limit(1)
          .as("s"),
      (join) => join.onTrue(),
    )
    .where("a.ruc", "is", null)
    .select([
      "m.ruc",
      "m.month",
      "m.gpv",
      "o.legal_name",
      "s.trade_name",
      "s.culqi_user_name",
    ])
    .orderBy("m.gpv", "desc")
    .limit(page.limit)
    .offset(page.offset)
    .execute();

  return rows.map((row) => ({
    ruc: row.ruc,
    month: monthFromStorageDate(row.month),
    organizationName: row.legal_name,
    tradeName: row.trade_name,
    sellerName: null,
    culqiUserName: row.culqi_user_name,
    gpvAtStake: row.gpv ?? 0,
    method: "none",
    confidence: "none",
    detail: QUALITY_ISSUE_COPY.no_owner.detail,
    evidence: null,
  }));
}

async function noTargetRows(
  db: DatabaseExecutor,
  page: Page,
): Promise<QualityRow[]> {
  const rows = await db
    .selectFrom("merchant_monthly_gpv as m")
    .leftJoinLateral(targetAsOfMonth, (join) => join.onTrue())
    .leftJoin("merchant_month_credit as a", (join) =>
      join.onRef("a.ruc", "=", "m.ruc").onRef("a.month", "=", "m.month"),
    )
    .leftJoin("organizations as o", "o.ruc", "m.ruc")
    .leftJoin("users as u", "u.id", "a.seller_user_id")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("merchant_sales as ms")
          .select(["ms.trade_name", "ms.culqi_user_name"])
          .whereRef("ms.ruc", "=", "m.ruc")
          .orderBy("ms.sold_at", "desc")
          .limit(1)
          .as("s"),
      (join) => join.onTrue(),
    )
    .where("t.monthly_target_gpv", "is", null)
    .select([
      "m.ruc",
      "m.month",
      "m.gpv",
      "a.method",
      "a.confidence",
      "a.evidence",
      "o.legal_name",
      "u.names",
      "u.first_surname",
      "s.trade_name",
      "s.culqi_user_name",
    ])
    .orderBy("m.gpv", "desc")
    .limit(page.limit)
    .offset(page.offset)
    .execute();

  return rows.map((row) => ({
    ruc: row.ruc,
    month: monthFromStorageDate(row.month),
    organizationName: row.legal_name,
    tradeName: row.trade_name,
    sellerName: displayName(row),
    culqiUserName: row.culqi_user_name,
    gpvAtStake: row.gpv ?? 0,
    method: row.method ?? "none",
    confidence: row.confidence ?? "none",
    detail: QUALITY_ISSUE_COPY.no_target.detail,
    evidence: row.evidence ?? null,
  }));
}

async function serialMismatchRows(
  db: DatabaseExecutor,
  page: Page,
): Promise<QualityRow[]> {
  const rows = await db
    .selectFrom("merchant_sales as s")
    .leftJoin("organizations as o", "o.ruc", "s.ruc")
    .leftJoin("merchant_monthly_gpv as m", (join) =>
      join.onRef("m.ruc", "=", "s.ruc").onRef("m.month", "=", "s.sale_month"),
    )
    .where((eb) => serialMismatched(eb))
    .select([
      "s.ruc",
      "s.sale_month",
      "s.serial_number",
      "s.trade_name",
      "s.culqi_user_name",
      "m.gpv",
      "o.legal_name",
    ])
    .orderBy("m.gpv", "desc")
    .limit(page.limit)
    .offset(page.offset)
    .execute();

  return rows.map((row) => ({
    ruc: row.ruc,
    month: monthFromStorageDate(row.sale_month),
    organizationName: row.legal_name,
    tradeName: row.trade_name,
    sellerName: null,
    culqiUserName: row.culqi_user_name,
    gpvAtStake: row.gpv ?? 0,
    method: "none" as const,
    confidence: "none" as const,
    detail: QUALITY_ISSUE_COPY.serial_mismatch.detail,
    evidence: { culqiSerial: row.serial_number },
  }));
}
