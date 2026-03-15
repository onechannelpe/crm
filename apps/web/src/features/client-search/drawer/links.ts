export function buildPersonHref(name: string, dni: string | null) {
  const type = dni ? "dni" : "person_name";
  const query = encodeURIComponent(dni ?? name);
  return `/contacts/search?type=${type}&query=${query}&limit=20`;
}

export function buildCompanyHref(name: string, ruc: string | null) {
  const type = ruc ? "ruc" : "company_name";
  const query = encodeURIComponent(ruc ?? name);
  return `/contacts/search?type=${type}&query=${query}&limit=20`;
}
