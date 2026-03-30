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

export type SidePanelIcon = Component<{
  class?: string;
  size?: string | number;
  color?: string;
}>;

export type SidePanelPageKey =
  | "root"
  | "search-person-detail"
  | "search-company-detail"
  | "lead-detail"
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

export type LeadDetailSidePanelPageState = {
  page: "lead-detail";
  leadId: number;
  title: string;
  subtitle: string;
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
  | LeadDetailSidePanelPageState
  | InventoryDetailSidePanelPageState
  | DataGridDetailSidePanelPageState;

export type SidePanelPageDefinition = {
  entry: SidePanelNavigationEntry;
  state: SidePanelPageState;
};

function createSidePanelPageId() {
  return crypto.randomUUID();
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

type CreateLeadDetailSidePanelPageInput = {
  leadId: number;
  title: string;
  subtitle?: string;
};

export function createLeadDetailSidePanelPage(
  input: CreateLeadDetailSidePanelPageInput,
): SidePanelPageDefinition {
  const pageId = createSidePanelPageId();

  return {
    entry: {
      page: "lead-detail",
      pageId,
      pageTitle: input.title,
      pageIcon: Building2,
    },
    state: {
      page: "lead-detail",
      leadId: input.leadId,
      title: input.title,
      subtitle: input.subtitle ?? `Prospecto ${input.leadId}`,
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
  const pageId = createSidePanelPageId();

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
