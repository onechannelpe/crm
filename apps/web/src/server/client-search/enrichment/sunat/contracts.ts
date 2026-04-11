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

export interface SunatScraperClient {
  fetchDni(dni: string): Promise<SunatDniData | null>;
  fetchRuc(ruc: string): Promise<SunatRucData | null>;
}
