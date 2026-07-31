import type { Kysely } from "kysely";

import type { SchemaModule } from ".";
import * as auth from "./modules/auth";
import * as capacity from "./modules/capacity";
import * as contactAssignments from "./modules/contact-assignments";
import * as core from "./modules/core";
import * as extensions from "./modules/extensions";
import * as files from "./modules/files";
import * as fulfillment from "./modules/fulfillment";
import * as identity from "./modules/identity";
import * as integrations from "./modules/integrations";
import * as merchantStats from "./modules/merchant-stats";
import * as notifications from "./modules/notifications";
import * as observability from "./modules/observability";
import * as organization from "./modules/organization";
import * as platform from "./modules/platform";
import * as pricing from "./modules/pricing";
import * as sales from "./modules/sales";
import * as search from "./modules/search";
import * as workflow from "./modules/workflow";

export const SCHEMA_MODULES: readonly SchemaModule[] = [
  core,
  identity,
  auth,
  organization,
  contactAssignments,
  capacity,
  notifications,
  extensions,
  search,
  platform,
  observability,
  workflow,
  integrations,
  files,
  pricing,
  sales,
  fulfillment,
  merchantStats,
];
