import { APP_LOCALE } from "~/lib/locale";

export function formatAmount(value: number | null | undefined): string {
  if (value == null) return "--";
  return new Intl.NumberFormat(APP_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatRate(value: number | null | undefined): string {
  if (value == null) return "--";
  return `${value.toFixed(2)}%`;
}
