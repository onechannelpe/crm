import { revalidate } from "@solidjs/router";

import { PUBLISHED_GPV_QUERY_KEYS } from "./data/revalidation";

export function refreshPublishedGpvData(): Promise<void> {
  return revalidate(PUBLISHED_GPV_QUERY_KEYS);
}
