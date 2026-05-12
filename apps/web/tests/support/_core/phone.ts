import { parsePhone, type Phone } from "~/lib/phone/pe-mobile";

const DEFAULT_PHONE = "999888777";

export function phone(value = DEFAULT_PHONE): Phone {
  const parsed = parsePhone(value);
  if (!parsed) throw new Error(`invalid test phone: ${value}`);
  return parsed;
}
