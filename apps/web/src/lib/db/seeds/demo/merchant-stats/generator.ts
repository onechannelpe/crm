import { addMonths, firstOfMonth } from "~/server/merchant-stats/intake/cells";
import type { MappedGpvRow } from "~/server/merchant-stats/intake/contracts";

import type { SeedContext } from "../../shared/context";
import { CULQI_MERCHANT_REPORT_PROFILE as PROFILE } from "./profile";

// Combined into "<A> <B>" business names.
const TRADE_HEADS = [
  "Bodega",
  "Minimarket",
  "Botica",
  "Restaurante",
  "Pollería",
  "Ferretería",
  "Cevichería",
  "Panadería",
  "Librería",
  "Boutique",
  "Barbería",
  "Cafetería",
];
const TRADE_TAILS = [
  "San Martín",
  "El Sol",
  "Los Andes",
  "La Molina",
  "Miraflores",
  "Surquillo",
  "El Dorado",
  "Central",
  "Primavera",
  "Real",
  "Don Pepe",
  "La Victoria",
];
const LEGAL_SUFFIXES = ["S.A.C.", "E.I.R.L.", "S.R.L.", "S.A."];

export interface MerchantSpec {
  ruc: string;
  merchantId: string;
  serialNumber: string | null;
  product: string;
  saleMonth: string;
  soldAt: string;
  tradeName: string;
  legalName: string;
  mesa: string;
  subchannel: string;
  clientType: string;
  stockType: string;
  offerAmount: number;
  promotion: string;
  trialAt: string | null;
  activatedAt: string | null;
  lastTransactionAt: string | null;
  m0Plus15dGpv: number;
  m0Plus15dTrx: number;
  series: Array<{ gpv: number; trx: number }>;
  realSellerName: string | null;
  zonal: string | null;
  projectedGpv: number | null;
}

export interface GenerateInput {
  context: SeedContext;
  linkedOrganizations: ReadonlyArray<{
    ruc: string;
    legalName: string;
    tradeName: string | null;
  }>;
  sellers: ReadonlyArray<{ name: string; branchName: string }>;
  // Used verbatim as ZONAL so the zone match resolves.
  branchNames: readonly string[];
  totalMerchants: number;
}

// mulberry32: seeds reproduce byte for byte so the demo dashboard is stable.
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMerchants(input: GenerateInput): MerchantSpec[] {
  const rng = mulberry32(input.context.randomSeed);
  const saleMonths = cohortMonths(input.context.anchorDate);
  const requiredCaseMonth = saleMonths.at(-2);
  if (!requiredCaseMonth)
    throw new Error("merchant_seed_missing_cohort_months");
  const merchants: MerchantSpec[] = [];
  for (let index = 0; index < input.totalMerchants; index++) {
    const linkedOrganization = input.linkedOrganizations[index];
    const ruc = linkedOrganization?.ruc ?? syntheticRuc(rng, index);
    merchants.push(
      buildMerchant(
        rng,
        input,
        saleMonths,
        requiredCaseMonth,
        ruc,
        index,
        linkedOrganization,
      ),
    );
  }
  return merchants;
}

function buildMerchant(
  rng: () => number,
  input: GenerateInput,
  saleMonths: readonly string[],
  requiredCaseMonth: string,
  ruc: string,
  index: number,
  linkedOrganization: GenerateInput["linkedOrganizations"][number] | undefined,
): MerchantSpec {
  const product = pickProduct(rng, index, input.totalMerchants);
  const saleMonth = index < 4 ? requiredCaseMonth : pickMonth(rng, saleMonths);
  const soldAt = dayWithin(rng, saleMonth);
  const series = buildSeries(rng);
  const trade = `${pick(rng, TRADE_HEADS)} ${pick(rng, TRADE_TAILS)}`;
  const activated = index !== 3 && chance(rng, PROFILE.activationRate);
  const anchorDate = input.context.anchorDate.toISOString().slice(0, 10);
  const trialAt = addDays(soldAt, 2 + Math.floor(rng() * 8));
  const activationCandidate = addDays(trialAt, 2 + Math.floor(rng() * 16));
  const activatedAt =
    activated && activationCandidate <= anchorDate ? activationCandidate : null;

  return {
    ruc,
    merchantId: `2000000${(1_000_000 + index).toString()}`,
    serialNumber: product.hasSerial ? syntheticSerial(rng, index) : null,
    product: product.value,
    saleMonth,
    soldAt,
    tradeName: linkedOrganization?.tradeName ?? trade,
    legalName:
      linkedOrganization?.legalName ??
      `${trade.toUpperCase()} ${pick(rng, LEGAL_SUFFIXES)}`,
    mesa: weightedPick(rng, PROFILE.mesas).value,
    subchannel: weightedPick(rng, PROFILE.subchannels).value,
    clientType: weightedPick(rng, PROFILE.clientTypes).value,
    stockType: weightedPick(rng, PROFILE.stockTypes).value,
    offerAmount: pick(rng, PROFILE.offerAmounts),
    promotion: weightedPick(rng, PROFILE.promotions).value,
    trialAt,
    activatedAt,
    lastTransactionAt: activatedAt
      ? dateBetween(rng, activatedAt, anchorDate)
      : null,
    m0Plus15dGpv: round2(series[0].gpv * (0.2 + rng() * 0.4)),
    m0Plus15dTrx: Math.round(series[0].trx * (0.2 + rng() * 0.4)),
    series,
    ...enrichment(rng, input, index),
  };
}

// VENDEDOR R / ZONAL / PROYECTADO are left blank on a minority so the
// "missing enrichment" filter and the data-quality panel have signal.
function enrichment(
  rng: () => number,
  input: GenerateInput,
  index: number,
): Pick<MerchantSpec, "realSellerName" | "zonal" | "projectedGpv"> {
  const seller = pick(rng, input.sellers);
  return {
    realSellerName:
      index !== 1 && chance(rng, PROFILE.enrichmentRates.seller)
        ? seller.name
        : null,
    zonal:
      index !== 3 && chance(rng, PROFILE.enrichmentRates.branch)
        ? chance(rng, 0.9)
          ? seller.branchName
          : pick(rng, input.branchNames)
        : null,
    projectedGpv:
      index !== 2 && chance(rng, PROFILE.enrichmentRates.projectedGpv)
        ? round2(2000 + rng() * 45000)
        : null,
  };
}

// Heavy-tailed monthly GPV with an m0..m3 decay. Most accounts are small,
// a few are large; later cohort months thin out as merchants churn.
function buildSeries(rng: () => number): Array<{ gpv: number; trx: number }> {
  const scale = tailedScale(rng);
  const decay = [1, 0.9 + rng() * 0.3, 0.6 + rng() * 0.3, 0.3 + rng() * 0.3];
  return decay.map((factor, offset) => {
    const alive = chance(rng, PROFILE.monthlyNonZeroRates[offset]);
    if (!alive) return { gpv: 0, trx: 0 };
    const gpv = round2(scale * factor * (0.7 + rng() * 0.6));
    const ticket = 40 + rng() * 120;
    return { gpv, trx: Math.max(1, Math.round(gpv / ticket)) };
  });
}

function tailedScale(rng: () => number): number {
  const r = rng();
  const q = PROFILE.gpvM0Quantiles;
  if (r < 0.5) return rng() * q.p50;
  if (r < 0.75) return q.p50 + rng() * (q.p75 - q.p50);
  if (r < 0.9) return q.p75 + rng() * (q.p90 - q.p75);
  if (r < 0.99) return q.p90 + rng() * (q.p99 - q.p90);
  return q.p99 + rng() * q.p99 * 1.5;
}

// Cohort metrics past the snapshot month are dropped, matching the intake's
// cutMonth rule. Enrichment fields are attached only for the enriched upload.
export function toMappedRow(
  merchant: MerchantSpec,
  rowNumber: number,
  cutDate: string,
  hasEnrichment: boolean,
): MappedGpvRow {
  const cutMonth = firstOfMonth(cutDate);
  const metrics = merchant.series.flatMap((point, offset) => {
    const month = addMonths(merchant.saleMonth, offset);
    if (month > cutMonth) return [];
    return [{ monthOffset: offset, month, gpv: point.gpv, trx: point.trx }];
  });

  return {
    rowNumber,
    ruc: merchant.ruc,
    merchantId: merchant.merchantId,
    serialNumber: merchant.serialNumber,
    product: merchant.product,
    soldAt: merchant.soldAt,
    saleMonth: merchant.saleMonth,
    tradeName: merchant.tradeName,
    legalName: merchant.legalName,
    culqiUserCode: null,
    culqiUserName: null,
    mesa: merchant.mesa,
    channel: "DEALERS",
    subchannel: merchant.subchannel,
    offerAmount: merchant.offerAmount,
    promotion: merchant.promotion,
    clientType: merchant.clientType,
    stockType: merchant.stockType,
    trialAt:
      merchant.trialAt && merchant.trialAt <= cutDate ? merchant.trialAt : null,
    activatedAt:
      merchant.activatedAt && merchant.activatedAt <= cutDate
        ? merchant.activatedAt
        : null,
    lastTransactionAt:
      merchant.lastTransactionAt && merchant.lastTransactionAt <= cutDate
        ? merchant.lastTransactionAt
        : null,
    m0Plus15dGpv: merchant.m0Plus15dGpv,
    m0Plus15dTrx: merchant.m0Plus15dTrx,
    metrics,
    realSellerName: hasEnrichment ? merchant.realSellerName : null,
    zonal: hasEnrichment ? merchant.zonal : null,
    projectedGpv: hasEnrichment ? merchant.projectedGpv : null,
    raw: buildRawRecord(merchant),
  };
}

function buildRawRecord(merchant: MerchantSpec): Record<string, string> {
  return {
    identificador_tributario: merchant.ruc,
    id_merchant: merchant.merchantId,
    num_serie: merchant.serialNumber ?? "",
    producto: merchant.product,
    fecha_venta: merchant.soldAt,
    anomes_vta: merchant.saleMonth.slice(0, 7).replace("-", ""),
    nbr_comercial: merchant.tradeName,
    nbr_razon_social: merchant.legalName,
    gpv_m0: merchant.series[0].gpv.toString(),
  };
}

function syntheticRuc(rng: () => number, index: number): string {
  const prefix = chance(rng, 0.85) ? "20" : "10";
  const body = (10_000_000 + index * 7919 + Math.floor(rng() * 900))
    .toString()
    .padStart(8, "0")
    .slice(0, 8);
  const base = `${prefix}${body}`;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = base
    .split("")
    .reduce(
      (total, digit, position) => total + Number(digit) * weights[position],
      0,
    );
  const remainder = 11 - (sum % 11);
  const checkDigit = remainder === 10 ? 0 : remainder === 11 ? 1 : remainder;
  return `${base}${checkDigit}`;
}

function syntheticSerial(rng: () => number, index: number): string {
  const block = (index * 13 + Math.floor(rng() * 9000))
    .toString()
    .padStart(10, "0");
  return `P3C325${block}`;
}

function pickProduct(
  rng: () => number,
  index: number,
  totalMerchants: number,
): (typeof PROFILE.products)[number] {
  if (index === 1 || index === totalMerchants - 2) {
    return PROFILE.products[1];
  }
  if (index === 2 || index === totalMerchants - 1) {
    return PROFILE.products[2];
  }
  return weightedPick(rng, PROFILE.products);
}

function weightedPick<T extends { weight: number }>(
  rng: () => number,
  items: readonly T[],
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const r = rng() * total;
  let acc = 0;
  for (const item of items) {
    acc += item.weight;
    if (r <= acc) return item;
  }
  return items[0];
}

function pickMonth(rng: () => number, months: readonly string[]): string {
  // Bias toward recent cohorts: square the roll so low indices are rarer.
  const skewed = 1 - rng() * rng();
  return months[
    Math.min(months.length - 1, Math.floor(skewed * months.length))
  ];
}

function cohortMonths(anchorDate: Date): string[] {
  const currentMonth = firstOfMonth(anchorDate.toISOString());
  return Array.from({ length: PROFILE.cohortWindowMonths }, (_, index) =>
    addMonths(currentMonth, index - PROFILE.cohortWindowMonths + 1),
  );
}

function dayWithin(rng: () => number, monthIso: string): string {
  const day = 1 + Math.floor(rng() * 27);
  return `${monthIso.slice(0, 8)}${day.toString().padStart(2, "0")}`;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateBetween(rng: () => number, start: string, end: string): string {
  const startMs = Date.parse(`${start}T00:00:00.000Z`);
  const endMs = Date.parse(`${end}T00:00:00.000Z`);
  const offsetDays = Math.floor(rng() * ((endMs - startMs) / 86_400_000 + 1));
  return addDays(start, offsetDays);
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function chance(rng: () => number, probability: number): boolean {
  return rng() < probability;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
