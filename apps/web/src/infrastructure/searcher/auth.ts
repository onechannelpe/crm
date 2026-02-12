import { env } from "~/shared/env";

export function getSearcherHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-api-key": env.searcherApiKey,
  };
}
