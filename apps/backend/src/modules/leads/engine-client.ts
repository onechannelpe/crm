const LEAD_ENGINE_URL = process.env.LEAD_ENGINE_URL || "http://localhost:8081";

export async function requestUnassignedLeads(limit: number) {
  const response = await fetch(`${LEAD_ENGINE_URL}/unassigned?limit=${limit}`);

  if (!response.ok) {
    throw new Error("Lead engine unavailable");
  }

  return await response.json();
}

export async function markLeadsAssigned(leadIds: number[], userId: number) {
  await fetch(`${LEAD_ENGINE_URL}/mark-assigned`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead_ids: leadIds, user_id: userId }),
  });
}

export async function searchLeads(query: string, filters: Record<string, any>) {
  const params = new URLSearchParams({ q: query, ...filters });
  const response = await fetch(`${LEAD_ENGINE_URL}/search?${params}`);

  if (!response.ok) {
    throw new Error("Search failed");
  }

  return await response.json();
}

export async function getLeadDetails(contactId: number) {
  const response = await fetch(`${LEAD_ENGINE_URL}/contacts/${contactId}`);

  if (!response.ok) {
    throw new Error("Contact not found");
  }

  return await response.json();
}
