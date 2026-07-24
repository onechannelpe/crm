import type { CalendarDate, CalendarMonth } from "~/lib/time/calendar-date";

export interface HomeMerchantRowView {
  ruc: string;
  name: string;
  gpv: number;
  projectedGpv: number | null;
  lastTransactionAt: CalendarDate | null;
  leadId: string | null;
}

export interface HomeMerchantPortfolioView {
  cutDate: CalendarDate | null;
  month: CalendarMonth | null;
  merchants: HomeMerchantRowView[];
}
