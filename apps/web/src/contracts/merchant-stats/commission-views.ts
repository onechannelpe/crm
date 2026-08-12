import type { PayoutBand } from "~/domain/merchant-stats/commission";
import type { CalendarMonth } from "~/domain/time/calendar-date";

export type MassMarketMesa = "MESA 2" | "MESA 3";
export type Mesa = "MESA 1" | "MESA 2" | "MESA 3";

export interface MassMarketCaja1MesaRow {
  mesa: MassMarketMesa;
  activeCountM0: number;
  target: number;
  activeCountM0Plus15: number;
  band: PayoutBand | null;
}

export type MassMarketCaja1Result =
  | { status: "pending_configuration" }
  | { status: "evaluated"; mesas: MassMarketCaja1MesaRow[] };

export interface BandCount {
  band: PayoutBand;
  activeCount: number;
}

export interface MassMarketCaja2MesaRow {
  mesa: MassMarketMesa;
  bandsM0PlusM1: BandCount[];
  bandsM2: BandCount[];
}

export type MassMarketCaja2Result =
  | { status: "pending_configuration" }
  | { status: "evaluated"; mesas: MassMarketCaja2MesaRow[] };

interface CorporateCaja2Window {
  qualifyingSum: number;
  qualifyingRucCount: number;
  active: boolean;
}

export interface CorporateCaja2UserRow {
  userCode: string;
  userName: string | null;
  m0PlusM1: CorporateCaja2Window;
  m2: CorporateCaja2Window;
}

export type CorporateCaja2Result =
  | { status: "pending_configuration" }
  | { status: "evaluated"; users: CorporateCaja2UserRow[] };

export type CompanyCaja3Result =
  | { status: "pending_configuration" }
  | { status: "evaluated"; totalGpv: number; target: number };

export type PenalidadReversionResult =
  | { status: "pending_configuration" }
  | {
      status: "evaluated";
      commissionedCount: number;
      penalizedCount: number;
      knownReversalTotal: number;
      unknownReversalCount: number;
    };

export interface PenalidadActivacionMesaRow {
  mesa: Mesa;
  total: number;
  active: number;
  inactive: number;
}

export type PenalidadActivacionResult =
  | { status: "pending_configuration" }
  | {
      status: "evaluated";
      byMesa: PenalidadActivacionMesaRow[];
      totalSales: number;
      totalActive: number;
      totalInactive: number;
      inactiveRate: number;
      maxInactiveRate: number;
      penalized: boolean;
    };

export interface CommissionManagerView {
  cohortMonth: CalendarMonth;
  massMarketCaja1: MassMarketCaja1Result;
  massMarketCaja2: MassMarketCaja2Result;
  penalidadReversion: PenalidadReversionResult;
  penalidadActivacion: PenalidadActivacionResult;
  companyCaja3: CompanyCaja3Result;
  corporateCaja2: CorporateCaja2Result;
}
