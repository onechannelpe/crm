import { createArtifactsRepo } from "./artifacts";
import { createAssetsRepo } from "./assets";
import { createEventsRepo } from "./events";
import { createSalesRepo } from "./sales";
import { createTokensRepo } from "./tokens";

export * from "./types";
export * from "./mappers";

export { createArtifactsRepo } from "./artifacts";
export { createAssetsRepo } from "./assets";
export { createEventsRepo } from "./events";
export { createSalesRepo } from "./sales";
export { createTokensRepo } from "./tokens";

export interface ArtifactRepos {
  artifacts: ReturnType<typeof createArtifactsRepo>;
  assets: ReturnType<typeof createAssetsRepo>;
  events: ReturnType<typeof createEventsRepo>;
  tokens: ReturnType<typeof createTokensRepo>;
  sales: ReturnType<typeof createSalesRepo>;
}
