const LOCAL_PE_MOBILE = /^9\d{8}$/;

export function normalizePeMobileLocalInput(
  value: string | null | undefined,
): string {
  if (!value) return "";
  const digits = value.replace(/\D+/g, "");
  if (digits.startsWith("51") && digits.length === 11) {
    return digits.slice(2);
  }
  return digits.slice(0, 9);
}

export function isValidPeMobileLocal(value: string): boolean {
  return LOCAL_PE_MOBILE.test(value.trim());
}

export function toPeMobileE164(local: string): string {
  if (!isValidPeMobileLocal(local)) {
    throw new Error("invalid_pe_mobile_local");
  }
  return `+51${local}`;
}

export function fromPeMobileE164(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const v = value.replace(/\s+/g, "").trim();
  if (!v.startsWith("+51")) {
    return null;
  }
  const local = v.slice(3);
  if (!isValidPeMobileLocal(local)) {
    return null;
  }
  return local;
}
