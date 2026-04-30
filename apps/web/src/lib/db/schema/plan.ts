import * as auth from "./modules/auth";
import * as capacity from "./modules/capacity";
import * as core from "./modules/core";
import * as crm from "./modules/crm";
import * as extensions from "./modules/extensions";
import * as files from "./modules/files";
import * as integrations from "./modules/integrations";
import * as negotiation from "./modules/negotiation";
import * as notifications from "./modules/notifications";
import * as observability from "./modules/observability";
import * as platform from "./modules/platform";
import * as sales from "./modules/sales";
import * as search from "./modules/search";
import * as workflow from "./modules/workflow";

export const SCHEMA_MODULES = [
  core,
  auth,
  crm,
  capacity,
  notifications,
  extensions,
  search,
  platform,
  observability,
  workflow,
  integrations,
  files,
  negotiation,
  sales,
] as const;
