import type { Component } from "solid-js";

import Building2 from "~/components/icons/building-2";
import Info from "~/components/icons/info";
import Search from "~/components/icons/search";
import User from "~/components/icons/user";
import Users from "~/components/icons/users";
import type { LeadActionKind } from "~/features/record-show/model/lead-action-kind";
import type { RecordTabId } from "~/features/record-show/model/record-tab-id";
import type {
  CompanyGroup,
  PersonGroup,
} from "~/features/search/model/grouping";
import {
  DEFAULT_LEAD_RECORD_DRAFT_STATE,
  type LeadRecordDraftState,
} from "~/features/side-panel/pages/create-lead/draft-state";

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
  | "lead-action"
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
  activeTab: RecordTabId;
};

export type LeadActionSidePanelPageState = {
  page: "lead-action";
  leadId: string;
  action: LeadActionKind;
  title: string;
  subtitle: string;
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
  | LeadActionSidePanelPageState
  | DataGridDetailSidePanelPageState;

export type SidePanelPageDefinition = {
  entry: SidePanelNavigationEntry;
  state: SidePanelPageState;
};

function createSidePanelPageId() {
  return crypto.randomUUID();
}

function createEntitySidePanelPageId(page: SidePanelPageKey, entityId: string) {
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
  const pageId = createEntitySidePanelPageId(
    "search-company-detail",
    String(input.company.id),
  );

  return {
    entry: {
      page: "search-company-detail",
      pageId,
      pageTitle: input.company.name ?? input.company.ruc ?? "Empresa",
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
      pageTitle: "Nuevo cliente",
      pageIcon: Building2,
    },
    state: {
      page: "create-lead",
      recordType: "lead",
      title: "Nuevo cliente",
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
      subtitle: input.subtitle ?? `Cliente ${input.leadId}`,
      activeTab: "datos",
    },
  };
}

type CreateLeadActionSidePanelPageInput = {
  leadId: string;
  action: LeadActionKind;
  title: string;
  subtitle: string;
};

export function createLeadActionSidePanelPage(
  input: CreateLeadActionSidePanelPageInput,
): SidePanelPageDefinition {
  const pageId = createEntitySidePanelPageId(
    "lead-action",
    `${input.leadId}:${input.action}`,
  );

  return {
    entry: {
      page: "lead-action",
      pageId,
      pageTitle: input.title,
      pageIcon: Building2,
    },
    state: {
      page: "lead-action",
      leadId: input.leadId,
      action: input.action,
      title: input.title,
      subtitle: input.subtitle,
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
