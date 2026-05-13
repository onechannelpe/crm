import type { Role } from "~/lib/auth/access/rbac";

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

export type ActorContext = {
  userId: number;
  role: Role;
  branchId: number;
};
