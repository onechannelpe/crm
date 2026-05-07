export type SnackBarVariant =
  | "default"
  | "error"
  | "success"
  | "info"
  | "warning";

export interface SnackBarAction {
  label: string;
  onClick?: () => void;
}

export interface SnackBarOptions {
  message: string;
  details?: string;
  duration?: number;
  dedupeKey?: string;
  action?: SnackBarAction;
}

export interface SnackBarInternalItem extends SnackBarOptions {
  id: string;
  variant: SnackBarVariant;
  duration: number;
  remaining: number;
  paused: boolean;
  createdAt: number;
}

export interface SnackBarInternalState {
  queue: SnackBarInternalItem[];
}

export function enqueueWithDedupe(
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
  return [...queue, item];
}

export function removeSnackBarById(
  queue: SnackBarInternalItem[],
  id: string,
): SnackBarInternalItem[] {
  return queue.filter((item) => item.id !== id);
}

export function tickSnackBarTimers(
  queue: SnackBarInternalItem[],
  deltaMs: number,
): SnackBarInternalItem[] {
  const nextQueue = queue
    .map((item) => {
      if (item.paused || item.duration <= 0) {
        return item;
      }
      return {
        ...item,
        remaining: Math.max(0, item.remaining - deltaMs),
      };
    })
    .filter((item) => item.duration <= 0 || item.remaining > 0);

  return nextQueue;
}

export function setSnackBarPaused(
  queue: SnackBarInternalItem[],
  id: string,
  paused: boolean,
): SnackBarInternalItem[] {
  return queue.map((item) => (item.id === id ? { ...item, paused } : item));
}
