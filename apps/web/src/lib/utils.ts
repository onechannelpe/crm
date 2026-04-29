import { type ClassValue, clsx } from "clsx";

import { APP_LOCALE } from "./locale";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDateTime(timestamp: string | number): string {
  return new Date(timestamp).toLocaleString(APP_LOCALE);
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(APP_LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
