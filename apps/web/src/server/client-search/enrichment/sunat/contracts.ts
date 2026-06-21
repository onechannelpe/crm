import type { EnrichmentError } from "../../model";

export interface SunatDniData {
  dni: string;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  payload: unknown;
}

export interface SunatEconomicActivity {
  role: "principal" | "secondary";
  order: number | null;
  label: string;
  code: string;
  description: string;
}

export interface SunatRucData {
  ruc: string;
  legalName: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  contributorStatus: string | null;
  contributorCondition: string | null;
  economicActivities: SunatEconomicActivity[];
  payload: unknown;
}

export type DniApiResult =
  | { ok: true; data: SunatDniData }
  | { ok: false; error: EnrichmentError };

export type RucApiResult =
  | { ok: true; data: SunatRucData }
  | { ok: false; error: EnrichmentError };

export interface SunatScraperClient {
  fetchDni(dni: string, signal: AbortSignal): Promise<DniApiResult>;
  fetchRuc(ruc: string, signal: AbortSignal): Promise<RucApiResult>;
}
