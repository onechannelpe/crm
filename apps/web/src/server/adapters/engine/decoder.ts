import type {
  LeadCandidatesResponse,
  SearchResponse,
  SearchResult,
} from "~/server/shared/engine/types";

// Guards and validators (local to adapter, never called outside)

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function decodeSearchResult(value: unknown): SearchResult {
  if (!isObject(value)) {
    throw new Error("SearchResult must be an object");
  }

  const person = value.person;
  if (!isObject(person) || !isString(person.dni)) {
    throw new Error("SearchResult.person must have dni string");
  }

  const org = value.org;
  if (org !== null && org !== undefined) {
    if (!isObject(org)) {
      throw new Error("SearchResult.org must be object or null");
    }
  }

  const role = value.role;
  if (role !== null && role !== undefined && !isObject(role)) {
    throw new Error("SearchResult.role must be object or null");
  }

  const phones = value.phones;
  if (!isObject(phones)) {
    throw new Error("SearchResult.phones must be an object");
  }

  return {
    person: {
      dni: person.dni,
      name: isStringOrNull(person.name) ? person.name : null,
      ruc: isStringOrNull(person.ruc) ? person.ruc : null,
      birth_date: isStringOrNull(person.birth_date) ? person.birth_date : null,
      birth_place: isStringOrNull(person.birth_place) ? person.birth_place : null,
      sex: isStringOrNull(person.sex) ? person.sex : null,
      marital_status: isStringOrNull(person.marital_status)
        ? person.marital_status
        : null,
      location_text: isStringOrNull(person.location_text)
        ? person.location_text
        : null,
      ubigeo_code: isStringOrNull(person.ubigeo_code) ? person.ubigeo_code : null,
      mother_name: isStringOrNull(person.mother_name) ? person.mother_name : null,
      father_name: isStringOrNull(person.father_name) ? person.father_name : null,
      email: isStringOrNull(person.email) ? person.email : null,
    },
    org:
      org && isObject(org)
        ? {
            ruc: isStringOrNull(org.ruc) ? org.ruc : null,
            name: isStringOrNull(org.name) ? org.name : null,
            trade_name: isStringOrNull(org.trade_name) ? org.trade_name : null,
            company_type: isStringOrNull(org.company_type)
              ? org.company_type
              : null,
            status: isStringOrNull(org.status) ? org.status : null,
            condition: isStringOrNull(org.condition) ? org.condition : null,
            fiscal_address: isStringOrNull(org.fiscal_address)
              ? org.fiscal_address
              : null,
            registration_date: isStringOrNull(org.registration_date)
              ? org.registration_date
              : null,
            activity_start_date: isStringOrNull(org.activity_start_date)
              ? org.activity_start_date
              : null,
            line_of_business: isStringOrNull(org.line_of_business)
              ? org.line_of_business
              : null,
            economic_activity: isStringOrNull(org.economic_activity)
              ? org.economic_activity
              : null,
            ubigeo_code: isStringOrNull(org.ubigeo_code) ? org.ubigeo_code : null,
            department: isStringOrNull(org.department) ? org.department : null,
            province: isStringOrNull(org.province) ? org.province : null,
            district: isStringOrNull(org.district) ? org.district : null,
          }
        : null,
    role:
      role && isObject(role)
        ? {
            name: isStringOrNull(role.name) ? role.name : null,
            start_date: isStringOrNull(role.start_date) ? role.start_date : null,
            rep_doc_type: isStringOrNull(role.rep_doc_type)
              ? role.rep_doc_type
              : null,
            rep_doc_number: isStringOrNull(role.rep_doc_number)
              ? role.rep_doc_number
              : null,
            rep_name: isStringOrNull(role.rep_name) ? role.rep_name : null,
          }
        : null,
    phones: {
      primary: isStringOrNull(phones.primary) ? phones.primary : null,
      secondary: isStringOrNull(phones.secondary) ? phones.secondary : null,
      siblings:
        phones.siblings === null || phones.siblings === undefined
          ? null
          : isArray(phones.siblings) &&
              phones.siblings.every((sibling) => isString(sibling))
            ? phones.siblings
            : null,
    },
  };
}

export function decodeSearchResponse(value: unknown): SearchResponse {
  if (!isObject(value)) {
    throw new Error("Response must be an object");
  }

  const results = value.results;
  if (!isArray(results)) {
    throw new Error("Response.results must be an array");
  }

  const count = value.count;
  if (typeof count !== "number") {
    throw new Error("Response.count must be a number");
  }

  const decodedResults: SearchResult[] = [];
  for (let i = 0; i < results.length; i++) {
    try {
      decodedResults.push(decodeSearchResult(results[i]));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Response.results[${i}]: ${message}`, { cause: err });
    }
  }

  return { results: decodedResults, count };
}

export function decodeLeadCandidatesResponse(value: unknown): LeadCandidatesResponse {
  if (!isObject(value)) {
    throw new Error("Response must be an object");
  }

  const candidates = value.candidates;
  if (!isArray(candidates)) {
    throw new Error("Response.candidates must be an array");
  }

  const decoded: LeadCandidatesResponse["candidates"] = [];
  for (let i = 0; i < candidates.length; i++) {
    const item = candidates[i];
    if (!isObject(item)) {
      throw new Error(`Response.candidates[${i}] must be an object`);
    }

    if (
      !isString(item.ruc) ||
      !isString(item.organization_name) ||
      !isString(item.dni) ||
      !isString(item.person_name) ||
      !isString(item.phone_primary)
    ) {
      throw new Error(
        `Response.candidates[${i}] missing required string fields (ruc, organization_name, dni, person_name, phone_primary)`,
      );
    }

    decoded.push({
      ruc: item.ruc,
      organization_name: item.organization_name,
      dni: item.dni,
      person_name: item.person_name,
      phone_primary: item.phone_primary,
    });
  }

  return { candidates: decoded, count: decoded.length };
}
