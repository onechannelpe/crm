import { createLogger } from "~/lib/observability/logger";

import { migrateToLatest } from "./migrate";

const logger = createLogger("db-migrate-cli");

migrateToLatest()
  .then(() => {
    logger.info("migration_complete");
    process.exit(0);
  })
  .catch((err) => {
    logger.error("migration_failed", { error: err });
    process.exit(1);
  });
