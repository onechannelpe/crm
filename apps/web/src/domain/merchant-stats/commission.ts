import { fail, type DomainError } from "~/domain/errors";
import { Err, isErr, Ok, type Result } from "~/shared/result";

// A band's max is null for the open-ended top band ("50,001 a mas").
// A band's payout is null until someone enters a real peso amount -- every
// payout figure in this scheme is still undecided. Never default this to 0;
// that would silently mean "pays nothing," a different fact from "not
// decided yet."
export interface PayoutBand {
  min: number;
  max: number | null;
  payout: number | null;
}

export interface GpvTrxThreshold {
  minGpv: number;
  minTrx: number;
}

// Mesa 2 & 3 (mass market), Caja 1: activation in M0, payout bands at M0+15.
export interface MassMarketCaja1Rules {
  activation: GpvTrxThreshold;
  m0Target: number;
  m0Plus15Bands: PayoutBand[];
}

// Mesa 2 & 3 (mass market), Caja 2: per-active-POS gpv bands, scored
// separately for the M0+M1 window and the M2 window.
export interface MassMarketCaja2Rules {
  activePosMinGpv: number;
  bandsM0PlusM1: PayoutBand[];
  bandsM2: PayoutBand[];
}

// Mesa 1 (corporate), Caja 2: per-user (culqi_user_code), two criteria that
// must both hold on the sum of that user's qualifying RUCs.
export interface CorporateCaja2Rules {
  activeRucMinGpv: number;
  minAggregateGpv: number;
  minQualifyingRucs: number;
}

// Company-wide, Caja 3: one flat target across all mesas and all products.
export interface CompanyCaja3Rules {
  targetGpv: number;
}

// Mesa 2 & 3 only. Mesa 1's reversion rule is unstated (PendingRuleSlot).
export interface PenalidadReversionRules {
  minM2Gpv: number;
  reversalPct: number;
}

// All mesas; the "active" floor differs per mesa, the inactive-rate cap
// is evaluated company-wide.
export interface PenalidadActivacionRules {
  minCumulativeGpvByMesa: {
    mesa1: number;
    mesa2: number;
    mesa3: number;
  };
  maxInactiveRate: number;
}

// Uniform floor Infinity Pay imposes on its own executives, stricter than
// and independent of Culqi's mesa-based criteria.
export interface ExecutiveActivationBarRules {
  minGpvPerSale: number;
}

// A slot whose RULE SHAPE (not just its values) is unknown -- distinct from
// a known shape with unset values, which is typed `T | null` instead.
export interface PendingRuleSlot {
  status: "pending";
}

export interface CommissionSchemeRules {
  massMarket: {
    caja1: MassMarketCaja1Rules | null;
    caja2: MassMarketCaja2Rules | null;
  };
  corporate: {
    caja1: PendingRuleSlot;
    caja2: CorporateCaja2Rules | null;
  };
  company: {
    caja3: CompanyCaja3Rules | null;
  };
  penalidadReversion: {
    massMarket: PenalidadReversionRules | null;
    corporate: PendingRuleSlot;
  };
  penalidadActivacion: PenalidadActivacionRules | null;
  executiveActivationBar: ExecutiveActivationBarRules | null;
}

// Starting thresholds confirmed for this scheme. Bands and criteria are
// solid; payout amounts are not written down anywhere yet, so every
// `payout` stays null -- inventing a peso figure would be worse than
// leaving it blank. A sales manager can edit any of this from Settings;
// these are a starting point, not a lock-in.
export function defaultMassMarketCaja1Rules(): MassMarketCaja1Rules {
  return {
    activation: { minGpv: 1000, minTrx: 3 },
    m0Target: 24,
    m0Plus15Bands: [
      { min: 20, max: 30, payout: null },
      { min: 31, max: 40, payout: null },
      { min: 41, max: 50, payout: null },
      { min: 51, max: 60, payout: null },
      { min: 61, max: null, payout: null },
    ],
  };
}

function defaultMassMarketCaja2Bands(): PayoutBand[] {
  return [
    { min: 2000, max: 8000, payout: null },
    { min: 8001, max: 20000, payout: null },
    { min: 20001, max: 50000, payout: null },
    { min: 50001, max: null, payout: null },
  ];
}

export function defaultMassMarketCaja2Rules(): MassMarketCaja2Rules {
  return {
    activePosMinGpv: 2000,
    bandsM0PlusM1: defaultMassMarketCaja2Bands(),
    bandsM2: defaultMassMarketCaja2Bands(),
  };
}

export function defaultCorporateCaja2Rules(): CorporateCaja2Rules {
  return {
    activeRucMinGpv: 2000,
    minAggregateGpv: 80000,
    minQualifyingRucs: 2,
  };
}

// ~4.5M soles -- stated as an estimate expected to be revised down, not a
// firm target.
export function defaultCompanyCaja3Rules(): CompanyCaja3Rules {
  return { targetGpv: 4_500_000 };
}

// 80% reversal is provisional, called out as unconfirmed when it was given.
export function defaultPenalidadReversionRules(): PenalidadReversionRules {
  return { minM2Gpv: 1000, reversalPct: 0.8 };
}

export function defaultPenalidadActivacionRules(): PenalidadActivacionRules {
  return {
    minCumulativeGpvByMesa: { mesa1: 2000, mesa2: 1000, mesa3: 1000 },
    maxInactiveRate: 0.1,
  };
}

export function defaultExecutiveActivationBarRules(): ExecutiveActivationBarRules {
  return { minGpvPerSale: 2000 };
}

export function defaultCommissionSchemeRules(): CommissionSchemeRules {
  return {
    massMarket: {
      caja1: defaultMassMarketCaja1Rules(),
      caja2: defaultMassMarketCaja2Rules(),
    },
    corporate: {
      caja1: { status: "pending" },
      caja2: defaultCorporateCaja2Rules(),
    },
    company: { caja3: defaultCompanyCaja3Rules() },
    penalidadReversion: {
      massMarket: defaultPenalidadReversionRules(),
      corporate: { status: "pending" },
    },
    penalidadActivacion: defaultPenalidadActivacionRules(),
    executiveActivationBar: defaultExecutiveActivationBarRules(),
  };
}

export function validateCommissionSchemeRules(
  rules: CommissionSchemeRules,
): Result<CommissionSchemeRules, DomainError> {
  if (rules.massMarket.caja1) {
    const result = validateMassMarketCaja1(rules.massMarket.caja1);
    if (isErr(result)) {
      return result;
    }
  }
  if (rules.massMarket.caja2) {
    const result = validateMassMarketCaja2(rules.massMarket.caja2);
    if (isErr(result)) {
      return result;
    }
  }
  if (rules.corporate.caja2) {
    const result = validateCorporateCaja2(rules.corporate.caja2);
    if (isErr(result)) {
      return result;
    }
  }
  if (rules.company.caja3 && rules.company.caja3.targetGpv < 0) {
    return Err(fail("commission_target_negative"));
  }
  if (rules.penalidadReversion.massMarket) {
    const result = validatePenalidadReversion(
      rules.penalidadReversion.massMarket,
    );
    if (isErr(result)) {
      return result;
    }
  }
  if (rules.penalidadActivacion) {
    const result = validatePenalidadActivacion(rules.penalidadActivacion);
    if (isErr(result)) {
      return result;
    }
  }
  if (
    rules.executiveActivationBar &&
    rules.executiveActivationBar.minGpvPerSale < 0
  ) {
    return Err(fail("commission_executive_bar_negative"));
  }

  return Ok(rules);
}

function validateMassMarketCaja1(
  rules: MassMarketCaja1Rules,
): Result<MassMarketCaja1Rules, DomainError> {
  if (rules.activation.minGpv < 0 || rules.activation.minTrx < 0) {
    return Err(fail("commission_activation_threshold_negative"));
  }
  if (rules.m0Target < 0) {
    return Err(fail("commission_m0_target_negative"));
  }
  const bands = validatePayoutBands(rules.m0Plus15Bands);
  if (isErr(bands)) {
    return bands;
  }
  return Ok(rules);
}

function validateMassMarketCaja2(
  rules: MassMarketCaja2Rules,
): Result<MassMarketCaja2Rules, DomainError> {
  if (rules.activePosMinGpv < 0) {
    return Err(fail("commission_active_pos_threshold_negative"));
  }
  const m0m1 = validatePayoutBands(rules.bandsM0PlusM1);
  if (isErr(m0m1)) {
    return m0m1;
  }
  const m2 = validatePayoutBands(rules.bandsM2);
  if (isErr(m2)) {
    return m2;
  }
  return Ok(rules);
}

function validateCorporateCaja2(
  rules: CorporateCaja2Rules,
): Result<CorporateCaja2Rules, DomainError> {
  if (
    rules.activeRucMinGpv < 0 ||
    rules.minAggregateGpv < 0 ||
    rules.minQualifyingRucs < 0
  ) {
    return Err(fail("commission_corporate_caja2_threshold_negative"));
  }
  return Ok(rules);
}

function validatePenalidadReversion(
  rules: PenalidadReversionRules,
): Result<PenalidadReversionRules, DomainError> {
  if (rules.minM2Gpv < 0) {
    return Err(fail("commission_reversion_threshold_negative"));
  }
  if (rules.reversalPct < 0 || rules.reversalPct > 1) {
    return Err(fail("commission_reversion_pct_out_of_range"));
  }
  return Ok(rules);
}

function validatePenalidadActivacion(
  rules: PenalidadActivacionRules,
): Result<PenalidadActivacionRules, DomainError> {
  const { mesa1, mesa2, mesa3 } = rules.minCumulativeGpvByMesa;
  if (mesa1 < 0 || mesa2 < 0 || mesa3 < 0) {
    return Err(fail("commission_activation_floor_negative"));
  }
  if (rules.maxInactiveRate < 0 || rules.maxInactiveRate > 1) {
    return Err(fail("commission_inactive_rate_out_of_range"));
  }
  return Ok(rules);
}

// Bands only need to be internally coherent (ascending, non-negative,
// bounded bands wider than zero, non-negative payouts) -- they don't need
// to be contiguous. The manager may legitimately leave a gap while a
// range's payout is still being decided.
function validatePayoutBands(
  bands: PayoutBand[],
): Result<PayoutBand[], DomainError> {
  if (bands.length === 0) {
    return Err(fail("commission_bands_empty"));
  }

  let previousMin = -1;
  for (const [index, band] of bands.entries()) {
    if (band.min < 0 || band.min <= previousMin) {
      return Err(fail("commission_bands_not_ascending"));
    }
    if (band.max !== null && band.max <= band.min) {
      return Err(fail("commission_band_range_invalid"));
    }
    if (band.max === null && index !== bands.length - 1) {
      return Err(fail("commission_band_open_end_not_last"));
    }
    if (band.payout !== null && band.payout < 0) {
      return Err(fail("commission_band_payout_negative"));
    }
    previousMin = band.min;
  }

  return Ok(bands);
}
