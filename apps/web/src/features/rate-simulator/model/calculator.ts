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

function parseSection(
  section: Record<Medio, string>,
  sectionName: "mix" | "currentRates" | "proposalRates",
): ParseResult<Record<Medio, bigint>> {
  const values: Record<Medio, bigint> = {
    debito: 0n,
    credito: 0n,
    foranea: 0n,
  };

  for (const medio of MEDIOS) {
    const parsedValue = parsePercent(section[medio], `${sectionName}.${medio}`);
    if (!parsedValue.ok) {
      return parsedValue;
    }

    values[medio] = parsedValue.value;
  }

  return { ok: true, value: values };
}

function parsePayload(input: RatesInput): ParseResult<RatesPayload> {
  const mix = parseSection(input.mix, "mix");
  if (!mix.ok) {
    return mix;
  }

  const currentRates = parseSection(input.currentRates, "currentRates");
  if (!currentRates.ok) {
    return currentRates;
  }

  const proposalRates = parseSection(input.proposalRates, "proposalRates");
  if (!proposalRates.ok) {
    return proposalRates;
  }

  const mixTotal = mix.value.debito + mix.value.credito + mix.value.foranea;

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
      mix: mix.value,
      currentRates: currentRates.value,
      proposalRates: proposalRates.value,
    },
  };
}

function weightedRate(
  rates: Record<Medio, bigint>,
  mix: Record<Medio, bigint>,
) {
  let numerator = 0n;

  for (const medio of MEDIOS) {
    numerator += rates[medio] * mix[medio];
  }

  return divideRoundHalfUp(numerator, SCALE);
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
