const LOCAL_PE_MOBILE = /^9\d{8}$/;

export type Phone = string & { readonly __brand: "Phone" };

export function normalizePhoneInput(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D+/g, "");
  return digits.slice(0, 9);
}

export function isValidPhone(value: string): value is Phone {
  return LOCAL_PE_MOBILE.test(value.trim());
}

export function parsePhone(value: string | null | undefined): Phone | null {
  const normalized = normalizePhoneInput(value);
  if (!isValidPhone(normalized)) return null;
  return normalized;
}
