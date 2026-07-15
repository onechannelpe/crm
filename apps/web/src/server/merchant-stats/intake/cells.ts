import type { GpvCellValue } from "./types";

export function cellText(value: GpvCellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return isoDate(value);
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toFixed(0) : String(value);
  }
  return String(value).trim();
}

export function cellTextOrNull(value: GpvCellValue): string | null {
  const text = cellText(value);
  return text.length > 0 ? text : null;
}

export function cellNumberOrNull(value: GpvCellValue): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function cellNumber(value: GpvCellValue): number {
  return cellNumberOrNull(value) ?? 0;
}

export function cellDateOrNull(value: GpvCellValue): string | null {
  if (value instanceof Date) return isoDate(value);
  if (typeof value === "number") {
    // Excel serial date (days since 1899-12-30).
    const ms = Math.round((value - 25569) * 86_400_000);
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : isoDate(date);
  }
  const text = String(value ?? "").trim();
  if (!text) return null;
  return parseFlexibleDate(text);
}

export function saleMonthFromAnomes(value: GpvCellValue): string | null {
  const text = cellText(value).replace(/\D/g, "");
  if (text.length !== 6) return null;
  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(4, 6));
  if (month < 1 || month > 12) return null;
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-01`;
}

export function firstOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function addMonths(isoFirstOfMonth: string, months: number): string {
  const [year, month] = isoFirstOfMonth.split("-").map(Number);
  const zeroBased = month - 1 + months;
  const newYear = year + Math.floor(zeroBased / 12);
  const newMonth = ((zeroBased % 12) + 12) % 12;
  return `${newYear.toString().padStart(4, "0")}-${(newMonth + 1)
    .toString()
    .padStart(2, "0")}-01`;
}

function isoDate(date: Date): string {
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(
    date.getUTCMonth() + 1
  )
    .toString()
    .padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
}

// Dealer columns ultima_trx, dia_activo, and dia_prueba use ISO dates.
// fecha_venta uses d/m/y. In sampled exports, 1,013 of 1,340 cells prove
// d/m/y and none prove m/d/y, so the 327 ambiguous cells default to d/m/y.
// A cell whose second part exceeds 12 identifies m/d/y if the export changes locale.
function parseFlexibleDate(text: string): string | null {
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return buildDate(iso[1], Number(iso[2]), Number(iso[3]));

  const parts = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (parts) {
    const first = Number(parts[1]);
    const second = Number(parts[2]);
    const [month, day] =
      first > 12
        ? [second, first]
        : second > 12
          ? [first, second]
          : [second, first];
    return buildDate(parts[3], month, day);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : isoDate(parsed);
}

function buildDate(year: string, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year.padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}
