const MEDIOS = ["debito", "credito", "foranea"] as const;

export type Medio = (typeof MEDIOS)[number];

export interface RatesInput {
  mix: Record<Medio, string>;
  currentRates: Record<Medio, string>;
  proposalRates: Record<Medio, string>;
}

export interface RatesResult {
  competenciaAntesIgv: bigint;
  competenciaDespuesIgv: bigint;
  culqiAntesIgv: bigint;
  culqiDespuesIgv: bigint;
}

export interface SummaryTable {
  COMPETENCIA: {
    "ANTES DE IGV": string;
    "DESPUES DE IGV": string;
  };
  CULQI: {
    "ANTES DE IGV": string;
    "DESPUES DE IGV": string;
  };
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

interface RatesPayload {
  mix: Record<Medio, bigint>;
  currentRates: Record<Medio, bigint>;
  proposalRates: Record<Medio, bigint>;
}

const SCALE = 10n ** 12n;
const IGV = scaleRatio("0.18");
const ADQUIRIENCIA_BASE = scaleRatio("0.40");

function scaleRatio(value: string): bigint {
  const parsed = parseRatio(value, "const");
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  return parsed.value;
}

function pow10(exp: number): bigint {
  return 10n ** BigInt(exp);
}

function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new Error("Denominador inválido");
  }

  if (numerator >= 0n) {
    return (numerator + denominator / 2n) / denominator;
  }

  return (numerator - denominator / 2n) / denominator;
}

function parseRatio(raw: string, field: string): ParseResult<bigint> {
  const normalized = raw.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,10})?$/.test(normalized)) {
    return {
      ok: false,
      error: `El campo '${field}' debe ser numérico y no negativo`,
    };
  }

  const [intPart, fracPart = ""] = normalized.split(".");
  const denominator = pow10(fracPart.length);
  const numerator = BigInt(`${intPart}${fracPart}`);

  return {
    ok: true,
    value: divideRoundHalfUp(numerator * SCALE, denominator),
  };
}

function parsePercent(raw: string, field: string): ParseResult<bigint> {
  const ratio = parseRatio(raw, field);
  if (!ratio.ok) {
    return ratio;
  }

  return {
    ok: true,
    value: divideRoundHalfUp(ratio.value, 100n),
  };
}

function parsePayload(input: RatesInput): ParseResult<RatesPayload> {
  const mix: Partial<Record<Medio, bigint>> = {};
  const currentRates: Partial<Record<Medio, bigint>> = {};
  const proposalRates: Partial<Record<Medio, bigint>> = {};

  for (const medio of MEDIOS) {
    const mixValue = parsePercent(input.mix[medio], `mix.${medio}`);
    if (!mixValue.ok) {
      return mixValue;
    }

    const currentValue = parsePercent(
      input.currentRates[medio],
      `currentRates.${medio}`,
    );
    if (!currentValue.ok) {
      return currentValue;
    }

    const proposalValue = parsePercent(
      input.proposalRates[medio],
      `proposalRates.${medio}`,
    );
    if (!proposalValue.ok) {
      return proposalValue;
    }

    mix[medio] = mixValue.value;
    currentRates[medio] = currentValue.value;
    proposalRates[medio] = proposalValue.value;
  }

  const mixTotal =
    (mix.debito ?? 0n) + (mix.credito ?? 0n) + (mix.foranea ?? 0n);

  if (mixTotal !== SCALE) {
    const currentTotalPct = formatPercent(mixTotal);
    return {
      ok: false,
      error: `La mezcla debe sumar 100%. Suma actual: ${currentTotalPct}`,
    };
  }

  return {
    ok: true,
    value: {
      mix: mix as Record<Medio, bigint>,
      currentRates: currentRates as Record<Medio, bigint>,
      proposalRates: proposalRates as Record<Medio, bigint>,
    },
  };
}

function weightedRate(
  rates: Record<Medio, bigint>,
  mix: Record<Medio, bigint>,
) {
  let total = 0n;

  for (const medio of MEDIOS) {
    total += divideRoundHalfUp(rates[medio] * mix[medio], SCALE);
  }

  return total;
}

export function calculateRates(input: RatesInput): ParseResult<RatesResult> {
  const payload = parsePayload(input);
  if (!payload.ok) {
    return payload;
  }

  const { mix, currentRates, proposalRates } = payload.value;

  const competenciaAntesIgv = weightedRate(currentRates, mix);
  const competenciaDespuesIgv = divideRoundHalfUp(
    competenciaAntesIgv * (SCALE + IGV),
    SCALE,
  );

  const culqiAntesIgv = weightedRate(proposalRates, mix);
  const culqiDespuesIgv = divideRoundHalfUp(
    culqiAntesIgv * (SCALE + divideRoundHalfUp(ADQUIRIENCIA_BASE * IGV, SCALE)),
    SCALE,
  );

  return {
    ok: true,
    value: {
      competenciaAntesIgv,
      competenciaDespuesIgv,
      culqiAntesIgv,
      culqiDespuesIgv,
    },
  };
}

export function formatPercent(value: bigint): string {
  const asPercentScaled = divideRoundHalfUp(value * 10_000n, SCALE);
  const whole = asPercentScaled / 100n;
  const decimals = (asPercentScaled % 100n).toString().padStart(2, "0");

  return `${whole.toString()}.${decimals}%`;
}

export function asSummaryTable(result: RatesResult): SummaryTable {
  return {
    COMPETENCIA: {
      "ANTES DE IGV": formatPercent(result.competenciaAntesIgv),
      "DESPUES DE IGV": formatPercent(result.competenciaDespuesIgv),
    },
    CULQI: {
      "ANTES DE IGV": formatPercent(result.culqiAntesIgv),
      "DESPUES DE IGV": formatPercent(result.culqiDespuesIgv),
    },
  };
}
