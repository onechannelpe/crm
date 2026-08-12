import type { RucMerchantStats } from "~/contracts/merchant-stats/views";
import { hasPermission, type Role } from "~/domain/auth/access/rbac";
import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { Err, Ok, type Result } from "~/shared/result";

import { dateFromStorage, monthFromStorageDate } from "../storage-month";
import { displayName } from "./names";

async function getMerchantStatsByRuc(
  db: DatabaseExecutor,
  ruc: string,
): Promise<RucMerchantStats> {
  const [devices, monthly] = await Promise.all([
    db
      .selectFrom("merchant_sales")
      .select(["id", "product", "serial_number", "sold_at", "m0_plus_15d_gpv"])
      .where("ruc", "=", ruc)
      .orderBy("sold_at", "desc")
      .execute(),
    db
      .selectFrom("merchant_monthly_gpv")
      .select(["month", "gpv", "trx"])
      .where("ruc", "=", ruc)
      .orderBy("month")
      .execute(),
  ]);

  const latestMonth = monthly.at(-1)?.month ?? null;

  const [target, attribution] = await Promise.all([
    latestMonth === null
      ? undefined
      : // Read the target in force for the latest realized month.
        db
          .selectFrom("merchant_gpv_targets as target")
          .innerJoin(
            "organizations as organization",
            "organization.id",
            "target.organization_id",
          )
          .select("target.monthly_target_gpv")
          .where("organization.ruc", "=", ruc)
          .where("target.effective_from", "<=", latestMonth)
          .orderBy("target.effective_from", "desc")
          .limit(1)
          .executeTakeFirst(),
    latestMonth === null
      ? undefined
      : db
          .selectFrom("merchant_month_credit as a")
          .innerJoin("users as u", "u.id", "a.seller_user_id")
          .select(["u.names", "u.first_surname"])
          .where("a.ruc", "=", ruc)
          .where("a.month", "=", latestMonth)
          .executeTakeFirst(),
  ]);

  return {
    projectedGpv: target?.monthly_target_gpv ?? null,
    devices: devices.map((row) => ({
      saleId: row.id,
      product: row.product,
      serialNumber: row.serial_number,
      soldAt: dateFromStorage(row.sold_at),
      m0Plus15dGpv: row.m0_plus_15d_gpv,
    })),
    monthlyGpv: monthly.map((row) => ({
      month: monthFromStorageDate(row.month),
      gpv: row.gpv,
      trx: row.trx,
    })),
    sellerName: attribution ? displayName(attribution) : null,
  };
}

export async function getMerchantStatsForViewer(
  db: DatabaseExecutor,
  input: { ruc: string; role: Role; userId: UserId },
): Promise<Result<RucMerchantStats, DomainError>> {
  if (!hasPermission(input.role, "dashboards:read")) {
    const ownership = await db
      .selectFrom("workflow_leads as lead")
      .innerJoin(
        "organizations as organization",
        "organization.id",
        "lead.organization_id",
      )
      .innerJoin(
        "organization_current_owners as owner",
        "owner.organization_id",
        "lead.organization_id",
      )
      .select("lead.id")
      .where("organization.ruc", "=", input.ruc)
      .where("owner.executive_id", "=", input.userId)
      .where("lead.deleted_at", "is", null)
      .executeTakeFirst();

    if (!ownership) {
      return Err(fail("merchant_stats_not_found"));
    }
  }

  return Ok(await getMerchantStatsByRuc(db, input.ruc));
}
