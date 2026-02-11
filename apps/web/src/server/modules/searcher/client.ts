const SEARCHER_URL = process.env.SEARCHER_URL || "http://localhost:3000";

export interface SearchResult {
  query: string;
  query_type: "dni" | "ruc" | "phone";
  found: boolean;
  results: Array<{
    dni: string | null;
    ruc: string | null;
    phones: string[];
    operators: string[];
  }>;
  count: number;
}

export async function searchByDNI(dni: string): Promise<SearchResult | null> {
  try {
    const response = await fetch(`${SEARCHER_URL}/lookup/dni/${dni}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function searchByRUC(ruc: string): Promise<SearchResult | null> {
  try {
    const response = await fetch(`${SEARCHER_URL}/lookup/ruc/${ruc}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function searchByPhone(
  phone: string,
): Promise<SearchResult | null> {
  try {
    const response = await fetch(`${SEARCHER_URL}/lookup/phone/${phone}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
