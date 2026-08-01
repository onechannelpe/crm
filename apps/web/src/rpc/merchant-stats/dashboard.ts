import type { BookFilter } from "~/contracts/merchant-stats/views";
import type { DomainError } from "~/domain/errors";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
  type Reader,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";

function readFilter(reader: Reader<DomainError>): BookFilter {
  return {
    branchId: reader.optStr("branchId") ?? undefined,
    sellerUserId: reader.optStr("sellerUserId") ?? undefined,
    month: reader.optCalendarMonth("month") ?? undefined,
    product: reader.optStr("product") ?? undefined,
  };
}

export async function requestMerchantGpvExportDownloadToken(
  filter: BookFilter,
) {
  "use server";

  return executeSessionServerFunction({
    name: "merchantStats.export",
    access: { kind: "permission", permission: "dashboards:read" },
    parse: () =>
      parseObject({ filter }, validationFail, (reader) => ({
        filter: reader.obj("filter", readFilter),
      })),
    audit: (input) => ({
      branchId: input.filter.branchId ?? null,
      sellerUserId: input.filter.sellerUserId ?? null,
      month: input.filter.month ?? null,
      product: input.filter.product ?? null,
    }),
    execute: (context, input) =>
      application.merchantStats.dashboard.export(context, input.filter),
  });
}
