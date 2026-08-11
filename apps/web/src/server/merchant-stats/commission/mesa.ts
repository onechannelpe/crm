import type {
  MassMarketMesa,
  Mesa,
} from "~/contracts/merchant-stats/commission-views";

// The `mesa` free-text column's known values. Mass-market desks share one
// set of caja rules; the corporate desk (mesa 1) has its own.
export const MASS_MARKET_MESAS: readonly MassMarketMesa[] = [
  "MESA 2",
  "MESA 3",
];

export const ALL_MESAS: readonly Mesa[] = ["MESA 1", "MESA 2", "MESA 3"];

export type { Mesa, MassMarketMesa };
