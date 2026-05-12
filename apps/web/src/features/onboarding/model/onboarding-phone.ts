const LOCAL_PHONE = /^\d{9}$/;
const E164_PE = /^\+51\d{9}$/;

export function isValidOnboardingPhone(value: string): boolean {
  const v = value.replace(/\s+/g, "").trim();
  return LOCAL_PHONE.test(v) || E164_PE.test(v);
}
