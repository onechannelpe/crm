import type { Generated } from "kysely";

import type {
  AbonoBank,
  AccountTypeKind,
} from "../../../workflow/contracts/lead-schema";

export interface WorkflowSaleVenuesTable {
  id: Generated<string>;
  sale_id: string;
  lead_id: string;
  nombre_comercial: string;
  cantidad_pos: number;
  direccion: string;
  referencia: string | null;
  distrito: string;
  provincia: string;
  departamento: string;
  banco_soles: AbonoBank;
  tipo_cuenta_soles: AccountTypeKind;
  nro_cuenta_soles: string;
  cci_soles: string | null;
  banco_dolares: AbonoBank | null;
  tipo_cuenta_dolares: AccountTypeKind | null;
  nro_cuenta_dolares: string | null;
  cci_dolares: string | null;
  abono: AbonoBank;
  created_at: number;
  created_by: number;
}
