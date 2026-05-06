import type { SearchResult } from "~/server/shared/engine/types";

export function makeSearchRow(partial: {
  dni?: string;
  name?: string;
  phone_primary?: string | null;
  phone_secondary?: string | null;
  org_ruc?: string | null;
  org_name?: string | null;
  sibling_phones?: string[] | null;
  email?: string | null;
}): SearchResult {
  const {
    dni = "12345678",
    name = "RICARDO GARCIA PINCHI",
    phone_primary = null,
    phone_secondary = null,
    org_ruc = null,
    org_name = null,
    sibling_phones = null,
    email = null,
  } = partial;

  return {
    person: {
      dni,
      name,
      ruc: null,
      birth_date: null,
      birth_place: null,
      sex: null,
      marital_status: null,
      location_text: null,
      ubigeo_code: null,
      mother_name: null,
      father_name: null,
      email,
    },
    org:
      org_ruc != null
        ? {
            ruc: org_ruc,
            name: org_name,
            trade_name: null,
            company_type: null,
            status: null,
            condition: null,
            fiscal_address: null,
            registration_date: null,
            activity_start_date: null,
            line_of_business: null,
            economic_activity: null,
            ubigeo_code: null,
            department: null,
            province: null,
            district: null,
          }
        : null,
    role: null,
    phones: {
      primary: phone_primary,
      secondary: phone_secondary,
      siblings: sibling_phones,
    },
  };
}
