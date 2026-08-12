import type { DomainError } from "~/domain/errors";
import type {
  CommissionSchemeRules,
  CorporateCaja2Rules,
  CompanyCaja3Rules,
  ExecutiveActivationBarRules,
  MassMarketCaja1Rules,
  MassMarketCaja2Rules,
  PayoutBand,
  PenalidadActivacionRules,
  PenalidadReversionRules,
} from "~/domain/merchant-stats/commission";
import {
  parseObject,
  validationFail,
  type Reader,
} from "~/server/platform/action/input-reader";
import type { Result } from "~/shared/result";

// Structural narrowing only (unknown -> typed). Business-rule validation
// (band ordering, ranges, non-negativity) is a separate pass --
// validateCommissionSchemeRules in ~/domain/merchant-stats/commission.
// Used both for the RPC write boundary and for narrowing the jsonb `rules`
// column back out of Postgres on every read.
export function parseCommissionSchemeRules(
  raw: unknown,
): Result<CommissionSchemeRules, DomainError> {
  return parseObject(raw, validationFail, buildCommissionSchemeRules);
}

// Exposed separately (not just parseCommissionSchemeRules) so an RPC
// handler that needs sibling fields alongside `rules` (e.g. effectiveFrom)
// can nest this reader inside its own parseObject via r.obj(...), instead
// of parsing `rules` as an isolated sub-document.
export function buildCommissionSchemeRules(
  r: Reader<DomainError>,
): CommissionSchemeRules {
  return {
    massMarket: r.obj("massMarket", (mm) => ({
      caja1: mm.optObj("caja1", buildMassMarketCaja1) ?? null,
      caja2: mm.optObj("caja2", buildMassMarketCaja2) ?? null,
    })),
    corporate: r.obj("corporate", (c) => ({
      caja1: { status: "pending" as const },
      caja2: c.optObj("caja2", buildCorporateCaja2) ?? null,
    })),
    company: r.obj("company", (c) => ({
      caja3: c.optObj("caja3", buildCompanyCaja3) ?? null,
    })),
    penalidadReversion: r.obj("penalidadReversion", (p) => ({
      massMarket: p.optObj("massMarket", buildPenalidadReversion) ?? null,
      corporate: { status: "pending" as const },
    })),
    penalidadActivacion:
      r.optObj("penalidadActivacion", buildPenalidadActivacion) ?? null,
    executiveActivationBar:
      r.optObj("executiveActivationBar", buildExecutiveActivationBar) ?? null,
  };
}

function buildMassMarketCaja1(r: Reader<DomainError>): MassMarketCaja1Rules {
  return {
    activation: r.obj("activation", (a) => ({
      minGpv: a.num("minGpv"),
      minTrx: a.num("minTrx"),
    })),
    m0Target: r.num("m0Target"),
    m0Plus15Bands: r.list("m0Plus15Bands", buildPayoutBand, { min: 1 }),
  };
}

function buildMassMarketCaja2(r: Reader<DomainError>): MassMarketCaja2Rules {
  return {
    activePosMinGpv: r.num("activePosMinGpv"),
    bandsM0PlusM1: r.list("bandsM0PlusM1", buildPayoutBand, { min: 1 }),
    bandsM2: r.list("bandsM2", buildPayoutBand, { min: 1 }),
  };
}

function buildCorporateCaja2(r: Reader<DomainError>): CorporateCaja2Rules {
  return {
    activeRucMinGpv: r.num("activeRucMinGpv"),
    minAggregateGpv: r.num("minAggregateGpv"),
    minQualifyingRucs: r.num("minQualifyingRucs"),
  };
}

function buildCompanyCaja3(r: Reader<DomainError>): CompanyCaja3Rules {
  return { targetGpv: r.num("targetGpv") };
}

function buildPenalidadReversion(
  r: Reader<DomainError>,
): PenalidadReversionRules {
  return {
    minM2Gpv: r.num("minM2Gpv"),
    reversalPct: r.num("reversalPct"),
  };
}

function buildPenalidadActivacion(
  r: Reader<DomainError>,
): PenalidadActivacionRules {
  return {
    minCumulativeGpvByMesa: r.obj("minCumulativeGpvByMesa", (m) => ({
      mesa1: m.num("mesa1"),
      mesa2: m.num("mesa2"),
      mesa3: m.num("mesa3"),
    })),
    maxInactiveRate: r.num("maxInactiveRate"),
  };
}

function buildExecutiveActivationBar(
  r: Reader<DomainError>,
): ExecutiveActivationBarRules {
  return { minGpvPerSale: r.num("minGpvPerSale") };
}

function buildPayoutBand(r: Reader<DomainError>): PayoutBand {
  return {
    min: r.num("min"),
    max: r.optNum("max"),
    payout: r.optNum("payout"),
  };
}
