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

// Use the active GPV snapshot cut as M0, falling back to the operation time.
export async function getCommissionManagerView(
  db: DatabaseExecutor,
  operation: OperationContext,
): Promise<CommissionManagerView> {
  const cutAt = await getActiveGpvSnapshotCut(db);
  const asOfDate = appCalendarDateAt(cutAt ?? operation.operationAt);
  const cohortMonth = calendarMonthFromDate(asOfDate);
  const scheme = await getCommissionSchemeAsOf(db, asOfDate);

  const [
    massMarketCaja1,
    massMarketCaja2,
    penalidadReversion,
    penalidadActivacion,
    companyCaja3,
    corporateCaja2,
  ] = await Promise.all([
    evaluateMassMarketCaja1(db, scheme.massMarket.caja1, cohortMonth),
    evaluateMassMarketCaja2(db, scheme.massMarket.caja2, cohortMonth),
    evaluatePenalidadReversion(
      db,
      scheme.penalidadReversion.massMarket,
      scheme.massMarket.caja2,
      cohortMonth,
    ),
    evaluatePenalidadActivacion(db, scheme.penalidadActivacion, cohortMonth),
    evaluateCompanyCaja3(db, scheme.company.caja3, cohortMonth),
    evaluateCorporateCaja2(db, scheme.corporate.caja2, cohortMonth),
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
