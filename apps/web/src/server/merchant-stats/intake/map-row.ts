import {
  addMonths,
  cellDateOrNull,
  cellNumber,
  cellNumberOrNull,
  cellText,
  cellTextOrNull,
  saleMonthFromAnomes,
} from "./cells";
import {
  GPV_COLUMNS,
  GPV_MAX_MONTH_OFFSET,
  MERCHANT_PRODUCTS,
  type GpvCellValue,
  type GpvMetricInput,
  type GpvRawRecord,
  type InvalidGpvRow,
  type MappedGpvRow,
} from "./contracts";

type Cells = Record<string, GpvCellValue>;

export type MapGpvRowResult =
  | { ok: true; row: MappedGpvRow }
  | { ok: false; row: InvalidGpvRow };

// Reads raw cells for a row, validates identity, and projects onto MappedGpvRow.
// cutMonth drops the structural future zeros: a metric month past the snapshot
// month carries no realized GPV yet and would fill in on a later snapshot.
export function mapGpvRow(input: {
  rowNumber: number;
  headers: readonly string[];
  cells: readonly GpvCellValue[];
  cutMonth: string;
}): MapGpvRowResult {
  const cells = toRecord(input.headers, input.cells);
  const raw = toRawRecord(input.headers, input.cells);

  const ruc = cellText(cells[GPV_COLUMNS.ruc]);
  const merchantId = cellText(cells[GPV_COLUMNS.merchantId]);
  const saleMonth = saleMonthFromAnomes(cells[GPV_COLUMNS.saleMonth]);
  const soldAt =
    cellDateOrNull(cells[GPV_COLUMNS.soldAt]) ??
    cellDateOrNull(cells[GPV_COLUMNS.soldAtAlt]) ??
    saleMonth;

  if (!/^\d{6,}$/.test(ruc)) {
    return invalid(input.rowNumber, ruc, merchantId, cells, raw, "Invalid RUC");
  }
  if (!merchantId) {
    return invalid(
      input.rowNumber,
      ruc,
      merchantId,
      cells,
      raw,
      "Missing id_merchant",
    );
  }
  if (!saleMonth || !soldAt) {
    return invalid(
      input.rowNumber,
      ruc,
      merchantId,
      cells,
      raw,
      "Missing or invalid sale date",
    );
  }

  const serialNumber = cellTextOrNull(cells[GPV_COLUMNS.serial]);
  const product = normalizeProduct(cellText(cells[GPV_COLUMNS.product]));

  return {
    ok: true,
    row: {
      rowNumber: input.rowNumber,
      ruc,
      merchantId,
      serialNumber,
      product,
      soldAt,
      saleMonth,
      tradeName: cellTextOrNull(cells[GPV_COLUMNS.tradeName]),
      legalName: cellTextOrNull(cells[GPV_COLUMNS.legalName]),
      culqiUserCode: cellTextOrNull(cells[GPV_COLUMNS.culqiUserCode]),
      culqiUserName: cellTextOrNull(cells[GPV_COLUMNS.culqiUserName]),
      mesa: cellTextOrNull(cells[GPV_COLUMNS.mesa]),
      channel: cellTextOrNull(cells[GPV_COLUMNS.channel]),
      subchannel: cellTextOrNull(cells[GPV_COLUMNS.subchannel]),
      offerAmount: cellNumberOrNull(cells[GPV_COLUMNS.offer]),
      promotion: cellTextOrNull(cells[GPV_COLUMNS.promotion]),
      clientType: cellTextOrNull(cells[GPV_COLUMNS.clientType]),
      stockType: cellTextOrNull(cells[GPV_COLUMNS.stockType]),
      trialAt: cellDateOrNull(cells[GPV_COLUMNS.trialAt]),
      activatedAt: cellDateOrNull(cells[GPV_COLUMNS.activatedAt]),
      lastTransactionAt: cellDateOrNull(cells[GPV_COLUMNS.lastTransactionAt]),
      m0Plus15dGpv: cellNumberOrNull(cells[GPV_COLUMNS.m0Plus15dGpv]),
      m0Plus15dTrx: cellNumberOrNull(cells[GPV_COLUMNS.m0Plus15dTrx]),
      metrics: readMetrics(cells, saleMonth, input.cutMonth),
      realSellerName: cellTextOrNull(cells[GPV_COLUMNS.realSeller]),
      zonal: cellTextOrNull(cells[GPV_COLUMNS.zonal]),
      projectedGpv: cellNumberOrNull(cells[GPV_COLUMNS.projected]),
      raw,
    },
  };
}

function readMetrics(
  cells: Cells,
  saleMonth: string,
  cutMonth: string,
): GpvMetricInput[] {
  const metrics: GpvMetricInput[] = [];
  for (let offset = 0; offset <= GPV_MAX_MONTH_OFFSET; offset++) {
    const gpvKey = `gpv_m${offset}`;
    if (!(gpvKey in cells)) continue;
    const month = addMonths(saleMonth, offset);
    if (month > cutMonth) continue;
    metrics.push({
      monthOffset: offset,
      month,
      gpv: cellNumber(cells[gpvKey]),
      trx: cellNumber(cells[`trx_m${offset}`]),
    });
  }
  return metrics;
}

function normalizeProduct(raw: string): string {
  const upper = raw.toUpperCase().replace(/\s+/g, "");
  const known = MERCHANT_PRODUCTS.find((p) => p === upper);
  return known ?? raw;
}

function toRecord(
  headers: readonly string[],
  cells: readonly GpvCellValue[],
): Cells {
  const record: Cells = {};
  for (let index = 0; index < headers.length; index++) {
    record[headers[index]] = cells[index];
  }
  return record;
}

function toRawRecord(
  headers: readonly string[],
  cells: readonly GpvCellValue[],
): GpvRawRecord {
  const record: GpvRawRecord = {};
  for (let index = 0; index < headers.length; index++) {
    record[headers[index]] = cellText(cells[index]);
  }
  return record;
}

function invalid(
  rowNumber: number,
  ruc: string,
  merchantId: string,
  cells: Cells,
  raw: GpvRawRecord,
  reason: string,
): MapGpvRowResult {
  return {
    ok: false,
    row: {
      rowNumber,
      ruc,
      merchantId: merchantId || null,
      serialNumber: cellTextOrNull(cells[GPV_COLUMNS.serial]),
      reason,
      raw,
    },
  };
}
