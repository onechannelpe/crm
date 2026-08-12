import type { BookFilter } from "~/contracts/merchant-stats/views";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

export async function requestMerchantGpvExportDownloadToken(
  filter: BookFilter,
) {
  "use server";

  return executeSessionServerFunction({
    name: "merchantStats.export",
    access: { kind: "permission", permission: "dashboards:read" },

    parse: () =>
      parseObject({ filter }, validationFail, (reader) => ({
        filter: reader.obj("filter", (r) => ({
          branchId: r.optStr("branchId") ?? undefined,
          sellerUserId: r.optStr("sellerUserId") ?? undefined,
          month: r.optCalendarMonth("month") ?? undefined,
          product: r.optStr("product") ?? undefined,
        })),
      })),

    telemetry: (input) => ({
      branchId: input.filter.branchId ?? null,
      sellerUserId: input.filter.sellerUserId ?? null,
      month: input.filter.month ?? null,
      product: input.filter.product ?? null,
    }),

    execute: (context, input) =>
      getApplication().merchantStats.dashboard.export(context, input.filter),
  });
}
