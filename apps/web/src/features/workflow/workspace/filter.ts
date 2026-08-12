import type { RecordIndexFilterCatalog } from "~/features/record-index/model/catalog";

import {
  LEAD_WORKSPACE_FILTER_FIELDS,
  type LeadWorkspaceFilterValue,
} from "./filter-fields";
import { LEAD_WORKSPACE_FILTER_DEFAULT } from "./filter-query";

export const LEAD_WORKSPACE_FILTER: RecordIndexFilterCatalog<LeadWorkspaceFilterValue> =
  {
    label: "Filtrar",
    menuId: "lead-workspace-filter-menu",
    fields: LEAD_WORKSPACE_FILTER_FIELDS,
    defaultValue: LEAD_WORKSPACE_FILTER_DEFAULT,
  };
