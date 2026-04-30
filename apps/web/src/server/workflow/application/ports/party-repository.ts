export type OrganizationProfile = {
  id: number;
  ruc: string;
  name: string;
  giroNegocio: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
};

export type LegalRepresentative = {
  organizationId: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string | null;
  email: string | null;
};

export type PartyRepository = {
  findOrganizationByRuc(ruc: string): Promise<OrganizationProfile | undefined>;
  findOrganizationById(id: number): Promise<OrganizationProfile | undefined>;
  createOrganization(values: {
    ruc: string;
    name: string;
    address: string | null;
    district: string | null;
    department: string | null;
  }): Promise<OrganizationProfile>;
  updateOrganizationCommercial(values: {
    organizationId: number;
    giroNegocio: string;
  }): Promise<void>;
  updateOrganizationFromEnrichment(values: {
    organizationId: number;
    name?: string;
    address?: string;
    district?: string;
    department?: string;
  }): Promise<void>;
  upsertPrimaryLegalRepresentative(values: LegalRepresentative): Promise<void>;
  findPrimaryLegalRepresentative(
    organizationId: number,
  ): Promise<LegalRepresentative | undefined>;
};
