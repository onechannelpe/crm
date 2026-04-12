import type { EnrichmentError } from "../../model";

export interface SunatDniData {
  dni: string;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  payload: unknown;
}

export interface SunatRucData {
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  contributorStatus: string | null;
  contributorCondition: string | null;
  payload: unknown;
}

// Discriminated unions from API layer
export type DniApiResult =
  | { ok: true; data: SunatDniData }
  | { ok: false; error: EnrichmentError };

export type RucApiResult =
  | { ok: true; data: SunatRucData }
  | { ok: false; error: EnrichmentError };

export interface SunatScraperClient {
  fetchDni(dni: string): Promise<DniApiResult>;
  fetchRuc(ruc: string): Promise<RucApiResult>;
}
