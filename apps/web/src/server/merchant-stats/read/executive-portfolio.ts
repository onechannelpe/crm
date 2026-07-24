import type {
  ExecutiveGpvMerchantView,
  ExecutiveGpvProgressView,
} from "~/contracts/merchant-stats/views";
import { appCalendarDateAt } from "~/lib/time/app-time";
import {
  calendarMonthFromDate,
  calendarMonthStart,
} from "~/lib/time/calendar-date";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";

import { dateFromStorage } from "../storage-month";
import { getActiveGpvSnapshotCut } from "./latest-report";

interface MerchantContext {
  tradeName: string | null;
  lastTransactionAt: ExecutiveGpvMerchantView["lastTransactionAt"];
}

export async function loadExecutiveGpvProgress(
  db: DatabaseExecutor,
  executiveId: UserId,
  now: Date,
): Promise<ExecutiveGpvProgressView> {
  const cutAt = await getActiveGpvSnapshotCut(db);
  const cutDate = cutAt ? appCalendarDateAt(cutAt) : null;
  const month = calendarMonthFromDate(appCalendarDateAt(cutAt ?? now));
  const monthStart = calendarMonthStart(month);
  const rows = await db
    .selectFrom("organizations as o")
    .leftJoin(
      "organization_current_owners as owner",
      "owner.organization_id",
      "o.id",
    )
    .leftJoin("merchant_monthly_gpv as m", (join) =>
      join.onRef("m.ruc", "=", "o.ruc").on("m.month", "=", monthStart),
    )
    .leftJoin("merchant_month_credit as credit", (join) =>
      join
        .onRef("credit.ruc", "=", "o.ruc")
        .on("credit.month", "=", monthStart),
    )
    .leftJoinLateral(
      (eb) =>
        eb
          .selectFrom("merchant_gpv_targets as target")
          .select("target.monthly_target_gpv")
          .whereRef("target.organization_id", "=", "o.id")
          .where("target.effective_from", "<=", monthStart)
          .orderBy("target.effective_from", "desc")
          .limit(1)
          .as("target"),
      (join) => join.onTrue(),
    )
    .where((eb) =>
      eb.or([
        eb("owner.executive_id", "=", executiveId),
        eb("credit.seller_user_id", "=", executiveId),
      ]),
    )
    .select([
      "o.ruc",
      "o.legal_name",
      "m.gpv",
      "credit.seller_user_id",
      "target.monthly_target_gpv",
    ])
    .execute();

  if (rows.length === 0) {
    return { cutDate, month, merchants: [] };
  }

  const rucs = rows.map((row) => row.ruc);
  const [merchantContextByRuc, leadIdByRuc] = await Promise.all([
    loadMerchantContext(db, rucs),
    loadLeadIds(db, rucs, executiveId),
  ]);

  const merchants = rows
    .map((row): ExecutiveGpvMerchantView => {
      const context = merchantContextByRuc.get(row.ruc);

      return {
        ruc: row.ruc,
        name: context?.tradeName ?? row.legal_name ?? row.ruc,
        gpv: row.seller_user_id === executiveId ? (row.gpv ?? 0) : 0,
        projectedGpv: row.monthly_target_gpv,
        lastTransactionAt: context?.lastTransactionAt ?? null,
        leadId: leadIdByRuc.get(row.ruc) ?? null,
      };
    })
    .toSorted(compareMerchants);

  return {
    cutDate,
    month,
    merchants,
  };
}

async function loadMerchantContext(
  db: DatabaseExecutor,
  rucs: readonly string[],
): Promise<Map<string, MerchantContext>> {
  const sales = await db
    .selectFrom("merchant_sales")
    .select(["ruc", "trade_name", "last_transaction_at", "sold_at"])
    .where("ruc", "in", rucs)
    .orderBy("ruc")
    .orderBy("sold_at", "desc")
    .execute();
  const byRuc = new Map<string, MerchantContext>();

  for (const sale of sales) {
    const current = byRuc.get(sale.ruc) ?? {
      tradeName: null,
      lastTransactionAt: null,
    };

    current.tradeName ??= sale.trade_name;
    if (
      sale.last_transaction_at &&
      (!current.lastTransactionAt ||
        sale.last_transaction_at > current.lastTransactionAt)
    ) {
      current.lastTransactionAt = dateFromStorage(sale.last_transaction_at);
    }

    byRuc.set(sale.ruc, current);
  }

  return byRuc;
}

async function loadLeadIds(
  db: DatabaseExecutor,
  rucs: readonly string[],
  executiveId: UserId,
): Promise<Map<string, string>> {
  const leads = await db
    .selectFrom("workflow_leads as lead")
    .innerJoin("organizations as o", "o.id", "lead.organization_id")
    .innerJoin(
      "organization_current_owners as owner",
      "owner.organization_id",
      "lead.organization_id",
    )
    .select(["o.ruc", "lead.id", "lead.created_at"])
    .where("o.ruc", "in", rucs)
    .where("owner.executive_id", "=", executiveId)
    .where("lead.deleted_at", "is", null)
    .where("lead.stage", "!=", "EXPIRED")
    .orderBy("lead.created_at", "desc")
    .execute();
  const byRuc = new Map<string, string>();

  for (const lead of leads) {
    if (!byRuc.has(lead.ruc)) {
      byRuc.set(lead.ruc, lead.id);
    }
  }

  return byRuc;
}

function compareMerchants(
  left: ExecutiveGpvMerchantView,
  right: ExecutiveGpvMerchantView,
): number {
  if (left.lastTransactionAt === null && right.lastTransactionAt !== null) {
    return -1;
  }
  if (left.lastTransactionAt !== null && right.lastTransactionAt === null) {
    return 1;
  }
  if (left.lastTransactionAt !== right.lastTransactionAt) {
    return (left.lastTransactionAt ?? "").localeCompare(
      right.lastTransactionAt ?? "",
    );
  }

  return left.name.localeCompare(right.name);
}
