import { fail, type DomainError } from "~/domain/errors";
import { Err, isErr, Ok, type Result } from "~/shared/result";

// `max` is null for the open-ended top band.
// `payout` is null when the amount has not been decided yet.
export interface PayoutBand {
  min: number;
  max: number | null;
  payout: number | null;
}

export interface GpvTrxThreshold {
  minGpv: number;
  minTrx: number;
}

export interface MassMarketCaja1Rules {
  activation: GpvTrxThreshold;
  m0Target: number;
  m0Plus15Bands: PayoutBand[];
}

export interface MassMarketCaja2Rules {
  activePosMinGpv: number;
  bandsM0PlusM1: PayoutBand[];
  bandsM2: PayoutBand[];
}

export interface CorporateCaja2Rules {
  activeRucMinGpv: number;
  minAggregateGpv: number;
  minQualifyingRucs: number;
}

export interface CompanyCaja3Rules {
  targetGpv: number;
}

export interface PenalidadReversionRules {
  minM2Gpv: number;
  reversalPct: number;
}

export interface PenalidadActivacionRules {
  minCumulativeGpvByMesa: {
    mesa1: number;
    mesa2: number;
    mesa3: number;
  };
  maxInactiveRate: number;
}

export interface ExecutiveActivationBarRules {
  minGpvPerSale: number;
}

// Use this when the rule shape itself is still unknown.
// A known rule with missing values should use `T | null` instead.
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

export function defaultCompanyCaja3Rules(): CompanyCaja3Rules {
  return { targetGpv: 4_500_000 };
}

// Provisional and not yet confirmed.
export function defaultPenalidadReversionRules(): PenalidadReversionRules {
  return {
    minM2Gpv: 1000,
    reversalPct: 0.8,
  };
}

export function defaultPenalidadActivacionRules(): PenalidadActivacionRules {
  return {
    minCumulativeGpvByMesa: {
      mesa1: 2000,
      mesa2: 1000,
      mesa3: 1000,
    },
    maxInactiveRate: 0.1,
  };
}

export function defaultExecutiveActivationBarRules(): ExecutiveActivationBarRules {
  return {
    minGpvPerSale: 2000,
  };
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
    company: {
      caja3: defaultCompanyCaja3Rules(),
    },
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
