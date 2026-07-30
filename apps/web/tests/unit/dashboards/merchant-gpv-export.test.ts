import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import type { CohortSaleRow } from "~/contracts/merchant-stats/views";
import {
  parseCalendarDate,
  parseCalendarMonth,
} from "~/lib/time/calendar-date";
import { validateUploadFile } from "~/server/files/validators";
import { buildMerchantGpvWorkbook } from "~/server/merchant-stats/export/workbook";

const SALE_MONTH = parseCalendarMonth("2026-05");
const SOLD_AT = parseCalendarDate("2026-05-14");
const ACTIVATED_AT = parseCalendarDate("2026-05-16");
const LAST_TRANSACTION_AT = parseCalendarDate("2026-07-03");
if (!SALE_MONTH || !SOLD_AT || !ACTIVATED_AT || !LAST_TRANSACTION_AT) {
  throw new Error("Invalid merchant export test dates");
}

const ROW: CohortSaleRow = {
  saleId: "sale-1",
  merchantId: "200000000233681",
  ruc: "20614775859",
  tradeName: "Infinity Pay",
  serialNumber: "P3C3250320000001",
  product: "CULQIFULL",
  saleMonth: SALE_MONTH,
  soldAt: SOLD_AT,
  activatedAt: ACTIVATED_AT,
  lastTransactionAt: LAST_TRANSACTION_AT,
  clientType: "NUEVO",
  organizationId: null,
  sellerName: "Ejecutiva CRM",
  culqiUserName: "Ejecutiva Culqi",
  branchName: "LIMA",
  subchannel: "INFINITY PAY LIMA",
  projectedGpv: 12_000,
  months: [
    { offset: 0, gpv: 0, trx: 0 },
    { offset: 2, gpv: 3_872.78, trx: 9 },
  ],
  m0Plus15d: { gpv: 12_747.04, trx: 25 },
};

describe("buildMerchantGpvWorkbook", () => {
  it("exports reproducible values and preserves missing periods as blanks", () => {
    const bytes = buildMerchantGpvWorkbook([ROW]);
    const workbook = XLSX.read(bytes, { cellDates: true });
    const worksheet = workbook.Sheets.BASE;
    if (!worksheet) throw new Error("Expected BASE worksheet");

    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      worksheet,
      {
        defval: null,
      },
    );

    expect(workbook.SheetNames).toEqual(["BASE"]);
    expect(
      validateUploadFile("merchant_gpv_export", "GPV.xlsx", bytes),
    ).toMatchObject({
      ok: true,
    });
    expect(records).toHaveLength(1);
    expect(Object.keys(records[0] ?? {})).toEqual([
      "fecha",
      "MES",
      "añomes_vta",
      "identificador_tributario",
      "ZONAL",
      "VENDEDOR R",
      "PROYECTADO",
      "tipo_cliente",
      "id_merchant",
      "num_serie",
      "producto",
      "nbr_comercial",
      "vendedor",
      "dia_activo",
      "ultima_trx",
      "gpv_m0",
      "trx_m0",
      "gpv_m0_15d",
      "trx_m0_15d",
      "gpv_m1",
      "trx_m1",
      "gpv_m2",
      "trx_m2",
    ]);
    expect(records[0]).toMatchObject({
      identificador_tributario: "20614775859",
      id_merchant: "200000000233681",
      ZONAL: "LIMA",
      "VENDEDOR R": "Ejecutiva CRM",
      gpv_m0: 0,
      trx_m0: 0,
      gpv_m0_15d: 12_747.04,
      gpv_m1: null,
      trx_m1: null,
      gpv_m2: 3_872.78,
      trx_m2: 9,
    });
    expect(worksheet["!autofilter"]?.ref).toBe(worksheet["!ref"]);
  });
});
