import type { Expression, ExpressionBuilder, SqlBool } from "kysely";

import type {
  Page,
  QualityRow,
  QualitySummary,
} from "~/contracts/merchant-stats/views";
import type {
  AttributionConfidence,
  QualityIssue,
} from "~/contracts/merchant-stats/vocabulary";
import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

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

const CONFIDENCE_ISSUES = [
  "conflict",
  "late",
  "none",
] as const satisfies ReadonlyArray<QualityIssue & AttributionConfidence>;

type ConfidenceIssue = (typeof CONFIDENCE_ISSUES)[number];

function isConfidenceIssue(value: string): value is ConfidenceIssue {
  return CONFIDENCE_ISSUES.some((issue) => issue === value);
}

const DETAIL: Record<QualityIssue, string> = {
  conflict:
    "Los dispositivos de este RUC apuntan a vendedores distintos. Uno de los registros describe otro dispositivo.",
  late: "El cliente se registró después de la venta, así que no hereda el crédito automáticamente.",
  none: "No hay evidencia en el CRM para este RUC: ni serial de fulfillment ni lead vigente.",
  no_target: "El RUC facturó este mes pero no tiene proyectado.",
  serial_mismatch:
    "El serial de Culqi no está entre los que registró fulfillment para este cliente.",
};

export async function getQualitySummary(
  db: DatabaseExecutor,
): Promise<QualitySummary> {
  const [byConfidence, noTarget, serialMismatch] = await Promise.all([
    db
      .selectFrom("merchant_monthly_attribution")
      .select((eb) => ["confidence", eb.fn.countAll<number>().as("count")])
      .where("resolved_by", "is", null)
      .groupBy("confidence")
      .execute(),
    db
      .selectFrom("merchant_monthly_gpv as m")
      .leftJoinLateral(targetAsOfMonth, (join) => join.onTrue())
      .where("t.projected_gpv", "is", null)
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .executeTakeFirst(),
    db
      .selectFrom("merchant_sales as s")
      .where((eb) => serialMismatched(eb))
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .executeTakeFirst(),
  ]);

  const counts: QualitySummary = {
    conflict: 0,
    late: 0,
    none: 0,
    no_target: 0,
    serial_mismatch: 0,
  };

  for (const row of byConfidence) {
    if (isConfidenceIssue(row.confidence)) counts[row.confidence] = row.count;
  }
  counts.no_target = noTarget?.count ?? 0;
  counts.serial_mismatch = serialMismatch?.count ?? 0;

  return counts;
}

export async function getQualityRows(
  db: DatabaseExecutor,
  issue: QualityIssue,
  page: Page,
): Promise<QualityRow[]> {
  if (issue === "serial_mismatch") return serialMismatchRows(db, page);
  if (issue === "no_target") return noTargetRows(db, page);
  return confidenceRows(db, issue, page);
}

async function confidenceRows(
  db: DatabaseExecutor,
  issue: ConfidenceIssue,
  page: Page,
): Promise<QualityRow[]> {
  const rows = await db
    .selectFrom("merchant_monthly_attribution as a")
    .innerJoin("merchant_monthly_gpv as m", (join) =>
      join.onRef("m.ruc", "=", "a.ruc").onRef("m.month", "=", "a.month"),
    )
    .leftJoin("organizations as o", "o.ruc", "a.ruc")
    .leftJoin("users as u", "u.id", "a.seller_user_id")
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("merchant_sales as ms")
          .select(["ms.trade_name", "ms.culqi_user_name"])
          .whereRef("ms.ruc", "=", "a.ruc")
          .orderBy("ms.sold_at", "desc")
          .limit(1)
          .as("s"),
      (join) => join.onTrue(),
    )
    .where("a.confidence", "=", issue)
    .where("a.resolved_by", "is", null)
    .select([
      "a.ruc",
      "a.month",
      "a.method",
      "a.confidence",
      "a.evidence",
      "m.gpv",
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
    month: row.month,
    organizationName: row.legal_name,
    tradeName: row.trade_name,
    sellerName: displayName(row),
    culqiUserName: row.culqi_user_name,
    gpvAtStake: row.gpv ?? 0,
    method: row.method,
    confidence: row.confidence,
    detail: DETAIL[issue],
    evidence: row.evidence,
  }));
}

async function noTargetRows(
  db: DatabaseExecutor,
  page: Page,
): Promise<QualityRow[]> {
  const rows = await db
    .selectFrom("merchant_monthly_gpv as m")
    .leftJoinLateral(targetAsOfMonth, (join) => join.onTrue())
    .leftJoin("merchant_monthly_attribution as a", (join) =>
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
    .where("t.projected_gpv", "is", null)
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
    month: row.month,
    organizationName: row.legal_name,
    tradeName: row.trade_name,
    sellerName: displayName(row),
    culqiUserName: row.culqi_user_name,
    gpvAtStake: row.gpv ?? 0,
    method: row.method ?? "none",
    confidence: row.confidence ?? "none",
    detail: DETAIL.no_target,
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
    month: row.sale_month,
    organizationName: row.legal_name,
    tradeName: row.trade_name,
    sellerName: null,
    culqiUserName: row.culqi_user_name,
    gpvAtStake: row.gpv ?? 0,
    method: "none" as const,
    confidence: "none" as const,
    detail: DETAIL.serial_mismatch,
    evidence: { culqiSerial: row.serial_number },
  }));
}
