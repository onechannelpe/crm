import type {
  BookFilter,
  GpvCulqiView,
  GpvPerformanceView,
} from "~/contracts/merchant-stats/views";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { OperationContext } from "~/server/platform/operation/context";

import { getAttainment } from "./attainment";
import { getCohortRamp } from "./cohort";
import { getCulqiUserGpv } from "./culqi-users";
import { getLifecycle } from "./lifecycle";
import { getLatestGpvMonth } from "./options";
import { getQualitySummary } from "./quality";

export async function getGpvPerformanceView(
  db: DatabaseExecutor,
  filter: BookFilter,
  operation: OperationContext,
): Promise<GpvPerformanceView> {
  const month = filter.month ?? (await getLatestGpvMonth(db));
  if (!month) {
    return { kind: "empty" };
  }

  const resolvedFilter = { ...filter, month };
  const [attainment, lifecycle, ramp, quality] = await Promise.all([
    getAttainment(db, resolvedFilter, month),
    getLifecycle(db, resolvedFilter, operation),
    getCohortRamp(db, resolvedFilter),
    getQualitySummary(db),
  ]);

  return {
    kind: "ready",
    month,
    attainment,
    lifecycle,
    ramp,
    quality,
  };
}

export async function getGpvCulqiView(
  db: DatabaseExecutor,
  filter: BookFilter,
): Promise<GpvCulqiView> {
  const month = filter.month ?? (await getLatestGpvMonth(db));
  if (!month) {
    return { kind: "empty" };
  }

  return {
    kind: "ready",
    month,
    rows: await getCulqiUserGpv(db, { ...filter, month }, month),
  };
}
