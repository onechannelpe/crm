import { query } from "@solidjs/router";

import { getExecutiveGpvProgress } from "~/server/merchant-stats/ui/executive-progress";

export const executiveGpvProgressQuery = query(async () => {
  "use server";
  return getExecutiveGpvProgress();
}, "merchant-stats.executive-progress");
