import type { JSX } from "solid-js";

export type SnackBarVariant =
  | "default"
  | "error"
  | "success"
  | "info"
  | "warning";

export interface SnackBarOptions {
  id: string;
  variant: SnackBarVariant;
  message: string;
  detailedMessage?: string;
  duration?: number;
  dedupeKey?: string;
  actionText?: string;
  actionOnClick?: () => void;
  actionTo?: string;
  onCancel?: () => void;
  icon?: JSX.Element;
  progress?: number;
  role?: "alert" | "status";
}

export interface SnackBarInternalItem extends Omit<
  SnackBarOptions,
  "duration"
> {
  duration: number;
}

export interface SnackBarInternalState {
  maxQueue: number;
  queue: SnackBarInternalItem[];
}

export function enqueueWithDedupe(
  maxQueue: number,
  queue: SnackBarInternalItem[],
  item: SnackBarInternalItem,
): SnackBarInternalItem[] {
  if (item.dedupeKey) {
    const hasDuplicate = queue.some(
      (queued) => queued.dedupeKey === item.dedupeKey,
    );
    if (hasDuplicate) {
      return queue;
    }
  }
  if (queue.length >= maxQueue) {
    return [...queue.slice(1), item];
  }
  return [...queue, item];
}

export function removeSnackBarById(
  queue: SnackBarInternalItem[],
  id: string,
): SnackBarInternalItem[] {
  return queue.filter((item) => item.id !== id);
}
