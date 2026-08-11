import {
  defaultCommissionSchemeRules,
  type CommissionSchemeRules,
} from "~/domain/merchant-stats/commission";
import type { CalendarDate } from "~/domain/time/calendar-date";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { isErr } from "~/shared/result";

import { parseCommissionSchemeRules } from "./rules-codec";

// Read the scheme as of a date so a later revision never changes how a
// past cohort was scored (mirrors read/target-as-of.ts's pattern). No row
// yet (a fresh instance, or before the manager has saved anything) reads as
// the confirmed starting thresholds, not an error or an empty scheme --
// the dashboard should show something useful from day one.
export async function getCommissionSchemeAsOf(
  db: DatabaseExecutor,
  asOf: CalendarDate,
): Promise<CommissionSchemeRules> {
  const row = await db
    .selectFrom("commission_scheme_versions")
    .select("rules")
    .where("effective_from", "<=", asOf)
    .orderBy("effective_from", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!row) {
    return defaultCommissionSchemeRules();
  }

  const parsed = parseCommissionSchemeRules(row.rules);
  if (isErr(parsed)) {
    // Every write goes through validateCommissionSchemeRules first, so a
    // stored row failing to parse means the schema and the codec drifted,
    // not a normal runtime condition -- surface it loudly.
    throw new Error(
      "commission_scheme_versions.rules failed to parse a row that should have been validated on write",
    );
  }

  return parsed.value;
}
