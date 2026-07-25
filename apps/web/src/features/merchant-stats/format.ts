import type { CalendarMonth } from "~/domain/time/calendar-date";

const SOLES = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 0,
});

const INTEGER = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

const MONTHS_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function formatSoles(value: number): string {
  return SOLES.format(value);
}

export function formatSolesCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `S/ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `S/ ${Math.round(value / 1_000)}K`;
  }
  return `S/ ${Math.round(value)}`;
}

export function formatInteger(value: number): string {
  return INTEGER.format(value);
}

export function formatMonth(value: CalendarMonth): string {
  const [year, month] = value.split("-").map(Number);
  const label = MONTHS_ES[(month - 1 + 12) % 12] ?? "";
  return `${label} ${String(year).slice(2)}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// Empty denominators display as 0%, not NaN.
export function formatRatio(numerator: number, denominator: number): string {
  if (denominator === 0) return "0%";

  const ratio = (numerator / denominator) * 100;
  const formatted = ratio.toFixed(1);
  if (formatted.endsWith(".0")) return `${Math.round(ratio)}%`;

  return `${formatted}%`;
}
