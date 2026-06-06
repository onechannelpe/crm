import type {
  AbonoBank,
  AccountTypeKind,
  ModalidadCobro,
  Moneda,
} from "./vocabulary";

export type SaleVenueAccount = {
  currency: Moneda;
  banco: AbonoBank;
  tipoCuenta: AccountTypeKind;
  nroCuenta: string;
  cci?: string;
  isSettlement: boolean;
};

export type VenueDigitalConfig = {
  linkUrl?: string | null;
  onlineUrl?: string | null;
  onlineModalidad?: ModalidadCobro | null;
};
