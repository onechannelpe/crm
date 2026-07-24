import { type ClassValue, clsx } from "clsx";

import { APP_LOCALE } from "./locale";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function capitalize(value: string): string {
  if (value.length === 0) {
    return value;
  }
  const normalized = value.toLocaleLowerCase(APP_LOCALE);
  return normalized[0].toLocaleUpperCase(APP_LOCALE) + normalized.slice(1);
}
