import type { EngineClientConfig } from "~/server/shared/engine/config";
import {
  ENGINE_ENDPOINTS,
  engineApiPath,
} from "~/server/shared/engine/contract";
import { validateSearchInput } from "~/server/shared/engine/input";
import { signRequest } from "~/server/shared/engine/signature";
import type { SearchResponse, SearchType } from "~/server/shared/engine/types";
import { assertSearchResponse } from "~/server/shared/engine/validation";

export interface EngineClient {
  search(
    type: SearchType,
    value: string,
    limit?: number,
  ): Promise<SearchResponse>;
  health(): Promise<boolean>;
}

export function createEngineClient(config: EngineClientConfig): EngineClient {
  async function post(path: string, body: string): Promise<Response> {
    const { signature, timestamp } = signRequest(body, config.hmacSecret);
    return fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      signal: AbortSignal.timeout(config.timeoutMs),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Key-Id": config.keyId,
        "X-Signature": signature,
        "X-Timestamp": timestamp,
      },
      body,
    });
  }

  return {
    async search(type, value, limit = 20) {
      validateSearchInput(type, value, limit);
      const body = JSON.stringify({ type, value, limit });
      const response = await post(engineApiPath(ENGINE_ENDPOINTS.search), body);

      if (!response.ok) {
        throw new Error(`Engine request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      return assertSearchResponse(payload);
    },

    async health() {
      try {
        const response = await fetch(
          `${config.baseUrl}${engineApiPath(ENGINE_ENDPOINTS.health)}`,
          {
            signal: AbortSignal.timeout(config.timeoutMs),
            headers: { Accept: "application/json" },
          },
        );

        return response.ok;
      } catch {
        return false;
      }
    },
  };
}
