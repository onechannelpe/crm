import type {
  HomeMerchantPortfolioView,
  HomeMerchantRowView,
} from "~/contracts/home/views";
import { appCalendarDateAt } from "~/lib/time/app-time";
import {
  calendarMonthFromDate,
  calendarMonthStart,
} from "~/lib/time/calendar-date";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";

import { dateFromStorage } from "../storage-month";
import { getLatestCompletedMerchantReportCut } from "./latest-report";
import { targetAsOfMonth } from "./target-as-of";

interface MerchantContext {
  tradeName: string | null;
  lastTransactionAt: HomeMerchantRowView["lastTransactionAt"];
}

export async function getExecutiveMerchantPortfolio(
  db: DatabaseExecutor,
  executiveId: UserId,
): Promise<HomeMerchantPortfolioView> {
  const cutAt = await getLatestCompletedMerchantReportCut(db);

  if (!cutAt) {
    return emptyPortfolio();
  }

  const cutDate = appCalendarDateAt(cutAt);
  const month = calendarMonthFromDate(cutDate);
  const rows = await db
    .selectFrom("merchant_monthly_gpv as m")
    .innerJoin("merchant_month_credit as a", (join) =>
      join.onRef("a.ruc", "=", "m.ruc").onRef("a.month", "=", "m.month"),
    )
    .leftJoinLateral(targetAsOfMonth, (join) => join.onTrue())
    .leftJoin("organizations as o", "o.ruc", "m.ruc")
    .where("m.month", "=", calendarMonthStart(month))
    .where("a.seller_user_id", "=", executiveId)
    .select(["m.ruc", "m.gpv", "o.legal_name", "t.projected_gpv"])
    .execute();

  if (rows.length === 0) {
    return { cutDate, month, totalGpv: 0, merchants: [] };
  }

  const rucs = rows.map((row) => row.ruc);
  const [merchantContextByRuc, leadIdByRuc] = await Promise.all([
    loadMerchantContext(db, rucs),
    loadLeadIds(db, rucs, executiveId),
  ]);

  const merchants = rows
    .map((row): HomeMerchantRowView => {
      const context = merchantContextByRuc.get(row.ruc);

      return {
        ruc: row.ruc,
        name: context?.tradeName ?? row.legal_name ?? row.ruc,
        gpv: row.gpv,
        projectedGpv: row.projected_gpv,
        lastTransactionAt: context?.lastTransactionAt ?? null,
        leadId: leadIdByRuc.get(row.ruc) ?? null,
      };
    })
    .toSorted(compareMerchants);

  return {
    cutDate,
    month,
    totalGpv: merchants.reduce((total, merchant) => total + merchant.gpv, 0),
    merchants,
  };
}

function emptyPortfolio(): HomeMerchantPortfolioView {
  return {
    cutDate: null,
    month: null,
    totalGpv: 0,
    merchants: [],
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
    .select(["o.ruc", "lead.id", "lead.created_at"])
    .where("o.ruc", "in", rucs)
    .where("lead.executive_id", "=", executiveId)
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
  left: HomeMerchantRowView,
  right: HomeMerchantRowView,
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
