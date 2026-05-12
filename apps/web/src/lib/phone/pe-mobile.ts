const LOCAL_PE_MOBILE = /^9\d{8}$/;

export type PeMobilePhone = string & { readonly __brand: "PeMobilePhone" };

export function normalizePeMobileInput(
  value: string | null | undefined,
): string {
  if (!value) return "";
  const digits = value.replace(/\D+/g, "");
  return digits.slice(0, 9);
}

export function isValidPeMobile(value: string): boolean {
  return LOCAL_PE_MOBILE.test(value.trim());
}

export function parsePeMobilePhone(
  value: string | null | undefined,
): PeMobilePhone | null {
  const normalized = normalizePeMobileInput(value);
  if (!isValidPeMobile(normalized)) return null;
  return normalized as PeMobilePhone;
}
