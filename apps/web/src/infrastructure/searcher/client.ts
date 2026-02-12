import { env } from "~/shared/env";
import { logger } from "~/shared/logger";
import { getSearcherHeaders } from "./auth";
import type { SearcherResponse, AssignRequest, AssignResponse } from "./types";

export class SearcherClient {
  static async getUnassigned(limit: number): Promise<SearcherResponse> {
    const url = `${env.searcherUrl}/leads/unassigned?limit=${limit}`;
    
    logger.debug("Requesting unassigned leads", { limit });
    
    const response = await fetch(url, {
      headers: getSearcherHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Searcher request failed", { status: response.status, error });
      throw new Error(`Searcher API error: ${response.status}`);
    }

    return await response.json();
  }

  static async markAssigned(request: AssignRequest): Promise<AssignResponse> {
    const url = `${env.searcherUrl}/leads/assign`;
    
    logger.debug("Marking leads as assigned", { count: request.lead_ids.length });
    
    const response = await fetch(url, {
      method: "POST",
      headers: getSearcherHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error("Searcher assign failed", { status: response.status, error });
      throw new Error(`Searcher API error: ${response.status}`);
    }

    return await response.json();
  }
}
