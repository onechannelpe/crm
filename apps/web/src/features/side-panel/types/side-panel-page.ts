import type { Component } from "solid-js";

import Building2 from "~/components/icons/building-2";
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
  | "lead-detail";

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

export type SidePanelPageState =
  | RootSidePanelPageState
  | SearchPersonDetailSidePanelPageState
  | SearchCompanyDetailSidePanelPageState
  | LeadDetailSidePanelPageState;

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
