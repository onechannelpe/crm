import type {
  SettlementBank,
  AccountTypeKind,
  CollectionMode,
  Currency,
} from "./vocabulary";

export type SaleVenueAccount = {
  currency: Currency;
  banco: SettlementBank;
  tipoCuenta: AccountTypeKind;
  nroCuenta: string;
  cci?: string;
  isSettlement: boolean;
};

export type VenueDigitalConfig = {
  linkUrl?: string | null;
  onlineUrl?: string | null;
  onlineCollectionMode?: CollectionMode | null;
};
