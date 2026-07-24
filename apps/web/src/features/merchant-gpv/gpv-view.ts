import { useSearchParams } from "@solidjs/router";
import { createMemo, type Accessor } from "solid-js";

import type { BookFilter } from "~/contracts/merchant-stats/views";
import { parseCalendarMonth } from "~/lib/time/calendar-date";

export const GPV_TAB_IDS = [
  "rendimiento",
  "cohortes",
  "atribucion",
  "culqi",
] as const;

export type GpvTabId = (typeof GPV_TAB_IDS)[number];

const DEFAULT_TAB: GpvTabId = "rendimiento";

type GpvQuery = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function readGpvTab(query: GpvQuery): GpvTabId {
  const raw = first(query.tab);
  return GPV_TAB_IDS.find((id) => id === raw) ?? DEFAULT_TAB;
}

export function readGpvFilter(query: GpvQuery): BookFilter {
  return {
    branchId: first(query.branch) || undefined,
    sellerUserId: first(query.seller) || undefined,
    month: parseCalendarMonth(first(query.month)) ?? undefined,
    product: first(query.product) || undefined,
  };
}

export interface GpvView {
  tab: Accessor<GpvTabId>;
  setTab: (id: GpvTabId) => void;
  filter: Accessor<BookFilter>;
  setFilter: (patch: Partial<BookFilter>) => void;
}

export function useGpvView(): GpvView {
  const [params, setParams] = useSearchParams<{
    tab?: string;
    branch?: string;
    seller?: string;
    month?: string;
    product?: string;
  }>();

  const filter = createMemo<BookFilter>(() => readGpvFilter(params));

  return {
    tab: () => readGpvTab(params),
    setTab: (id) =>
      setParams({ tab: id === DEFAULT_TAB ? null : id }, { scroll: false }),
    filter,
    setFilter: (patch) => {
      const next: Record<string, string | null> = {};
      // Omitted URL parameters stay unchanged. Null clears the selected filter.
      if ("branchId" in patch) next.branch = patch.branchId ?? null;
      if ("sellerUserId" in patch) next.seller = patch.sellerUserId ?? null;
      if ("month" in patch) next.month = patch.month ?? null;
      if ("product" in patch) next.product = patch.product ?? null;
      setParams(next, { replace: true, scroll: false });
    },
  };
}
