import type { Component } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Info from "~/components/icons/info";
import Search from "~/components/icons/search";
import User from "~/components/icons/user";
import Users from "~/components/icons/users";
import type {
  CompanyGroup,
  PersonGroup,
} from "~/features/search/model/grouping";
import {
  DEFAULT_LEAD_RECORD_DRAFT_STATE,
  type LeadRecordDraftState,
  type LeadRecordTabId,
} from "~/features/side-panel/pages/record-page/model";

export type SidePanelIcon = Component<{
  class?: string;
  size?: string | number;
  color?: string;
}>;

export type SidePanelPageKey =
  | "root"
  | "search-person-detail"
  | "search-company-detail"
  | "create-lead"
  | "view-record"
  | "inventory-detail"
  | "data-grid-detail";

export type SidePanelNavigationEntry = {
  page: SidePanelPageKey;
  pageId: string;
  pageTitle: string;
  pageIcon: SidePanelIcon;
};

export type RootSidePanelPageState = {
  page: "root";
};

export type SearchPersonDetailSidePanelPageState = {
  page: "search-person-detail";
  person: PersonGroup;
  query: string;
};

export type SearchCompanyDetailSidePanelPageState = {
  page: "search-company-detail";
  company: CompanyGroup;
  query: string;
};

export type CreateLeadSidePanelPageState = {
  page: "create-lead";
  recordType: "lead";
  title: string;
  subtitle: string;
  draft: LeadRecordDraftState;
};

export type ViewRecordSidePanelPageState = {
  page: "view-record";
  recordType: "lead";
  leadId: string;
  title: string;
  subtitle: string;
  activeTab: LeadRecordTabId;
};

export type InventoryDetailSidePanelPageState = {
  page: "inventory-detail";
  inventoryItemId: number;
  productName: string;
  serialNumber: string;
  category: string;
  status: string;
  createdAt: number;
};

export type DataGridDetailSidePanelItem = {
  label: string;
  value: string;
};

export type DataGridDetailSidePanelPageState = {
  page: "data-grid-detail";
  title: string;
  subtitle: string;
  items: DataGridDetailSidePanelItem[];
};

export type SidePanelPageState =
  | RootSidePanelPageState
  | SearchPersonDetailSidePanelPageState
  | SearchCompanyDetailSidePanelPageState
  | CreateLeadSidePanelPageState
  | ViewRecordSidePanelPageState
  | InventoryDetailSidePanelPageState
  | DataGridDetailSidePanelPageState;

export type SidePanelPageDefinition = {
  entry: SidePanelNavigationEntry;
  state: SidePanelPageState;
};

function createSidePanelPageId() {
  return crypto.randomUUID();
}

function createEntitySidePanelPageId(
  page: SidePanelPageKey,
  entityId: number | string,
) {
  return `${page}:${entityId}`;
}

export function createRootSidePanelPage(): SidePanelPageDefinition {
  const pageId = createSidePanelPageId();
  return {
    entry: {
      page: "root",
      pageId,
      pageTitle: "Menú de comandos",
      pageIcon: Search,
    },
    state: {
      page: "root",
    },
  };
}

type CreateSearchPersonDetailSidePanelPageInput = {
  person: PersonGroup;
  query: string;
};

export function createSearchPersonDetailSidePanelPage(
  input: CreateSearchPersonDetailSidePanelPageInput,
): SidePanelPageDefinition {
  const pageId = createSidePanelPageId();

  return {
    entry: {
      page: "search-person-detail",
      pageId,
      pageTitle: input.person.displayName,
      pageIcon: User,
    },
    state: {
      page: "search-person-detail",
      person: input.person,
      query: input.query,
    },
  };
}

type CreateSearchCompanyDetailSidePanelPageInput = {
  company: CompanyGroup;
  query: string;
};

export function createSearchCompanyDetailSidePanelPage(
  input: CreateSearchCompanyDetailSidePanelPageInput,
): SidePanelPageDefinition {
  const pageId = createSidePanelPageId();

  return {
    entry: {
      page: "search-company-detail",
      pageId,
      pageTitle: input.company.name ?? input.company.ruc ?? "Company",
      pageIcon: Users,
    },
    state: {
      page: "search-company-detail",
      company: input.company,
      query: input.query,
    },
  };
}

type CreateLeadRecordDetailSidePanelPageInput = {
  leadId: string;
  title: string;
  subtitle?: string;
};

export function createLeadRecordCreateSidePanelPage(): SidePanelPageDefinition {
  const pageId = createSidePanelPageId();

  return {
    entry: {
      page: "create-lead",
      pageId,
      pageTitle: "Nuevo prospecto",
      pageIcon: Building2,
    },
    state: {
      page: "create-lead",
      recordType: "lead",
      title: "Nuevo prospecto",
      subtitle: "Borrador",
      draft: DEFAULT_LEAD_RECORD_DRAFT_STATE,
    },
  };
}

export function createLeadRecordDetailSidePanelPage(
  input: CreateLeadRecordDetailSidePanelPageInput,
): SidePanelPageDefinition {
  const pageId = createEntitySidePanelPageId("view-record", input.leadId);

  return {
    entry: {
      page: "view-record",
      pageId,
      pageTitle: input.title,
      pageIcon: Building2,
    },
    state: {
      page: "view-record",
      recordType: "lead",
      leadId: input.leadId,
      title: input.title,
      subtitle: input.subtitle ?? `Prospecto ${input.leadId}`,
      activeTab: "home",
    },
  };
}

type CreateInventoryDetailSidePanelPageInput = {
  inventoryItemId: number;
  productName: string;
  serialNumber: string;
  category: string;
  status: string;
  createdAt: number;
};

export function createInventoryDetailSidePanelPage(
  input: CreateInventoryDetailSidePanelPageInput,
): SidePanelPageDefinition {
  const pageId = createEntitySidePanelPageId(
    "inventory-detail",
    input.inventoryItemId,
  );

  return {
    entry: {
      page: "inventory-detail",
      pageId,
      pageTitle: input.productName,
      pageIcon: Building2,
    },
    state: {
      page: "inventory-detail",
      inventoryItemId: input.inventoryItemId,
      productName: input.productName,
      serialNumber: input.serialNumber,
      category: input.category,
      status: input.status,
      createdAt: input.createdAt,
    },
  };
}

type CreateDataGridDetailSidePanelPageInput = {
  title: string;
  subtitle?: string;
  items: DataGridDetailSidePanelItem[];
};

export function createDataGridDetailSidePanelPage(
  input: CreateDataGridDetailSidePanelPageInput,
): SidePanelPageDefinition {
  const pageId = createSidePanelPageId();

  return {
    entry: {
      page: "data-grid-detail",
      pageId,
      pageTitle: input.title,
      pageIcon: Info,
    },
    state: {
      page: "data-grid-detail",
      title: input.title,
      subtitle: input.subtitle ?? "",
      items: input.items,
    },
  };
}
