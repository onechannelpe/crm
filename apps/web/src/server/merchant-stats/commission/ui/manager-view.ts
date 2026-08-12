import type { CommissionManagerView } from "~/contracts/merchant-stats/commission-views";
import { appCalendarDateAt } from "~/domain/time/app-time";
import { calendarMonthFromDate } from "~/domain/time/calendar-date";
import { getActiveGpvSnapshotCut } from "~/server/merchant-stats/read/latest-report";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { OperationContext } from "~/server/platform/operation/context";

import { evaluateCompanyCaja3 } from "../evaluate-company-caja3";
import { evaluateCorporateCaja2 } from "../evaluate-corporate-caja2";
import { evaluateMassMarketCaja1 } from "../evaluate-mass-market-caja1";
import { evaluateMassMarketCaja2 } from "../evaluate-mass-market-caja2";
import { evaluatePenalidadActivacion } from "../evaluate-penalidad-activacion";
import { evaluatePenalidadReversion } from "../evaluate-penalidad-reversion";
import { getCommissionSchemeAsOf } from "../scheme-repo";

// Same "cohort month = the active snapshot's cut, or now if none yet"
// convention as executive-portfolio.ts, so the manager dashboard and the
// executive's "Mis comercios" widget always agree on which month is M0.
export async function getCommissionManagerView(
  db: DatabaseExecutor,
  operation: OperationContext,
): Promise<CommissionManagerView> {
  const cutAt = await getActiveGpvSnapshotCut(db);
  const asOfDate = appCalendarDateAt(cutAt ?? operation.operationAt);
  const cohortMonth = calendarMonthFromDate(asOfDate);
  const rules = await getCommissionSchemeAsOf(db, asOfDate);

  const [
    massMarketCaja1,
    massMarketCaja2,
    penalidadReversion,
    penalidadActivacion,
    companyCaja3,
    corporateCaja2,
  ] = await Promise.all([
    evaluateMassMarketCaja1(db, rules.massMarket.caja1, cohortMonth),
    evaluateMassMarketCaja2(db, rules.massMarket.caja2, cohortMonth),
    evaluatePenalidadReversion(
      db,
      rules.penalidadReversion.massMarket,
      rules.massMarket.caja2,
      cohortMonth,
    ),
    evaluatePenalidadActivacion(db, rules.penalidadActivacion, cohortMonth),
    evaluateCompanyCaja3(db, rules.company.caja3, cohortMonth),
    evaluateCorporateCaja2(db, rules.corporate.caja2, cohortMonth),
  ]);

  return {
    cohortMonth,
    massMarketCaja1,
    massMarketCaja2,
    penalidadReversion,
    penalidadActivacion,
    companyCaja3,
    corporateCaja2,
  };
}
