import type { Component } from "solid-js";

import Search from "~/components/icons/search";

export type SidePanelIcon = Component<{
  class?: string;
  size?: string | number;
  color?: string;
}>;

export type RootSidePanelPage = {
  type: "root";
  instanceId: string;
  title: string;
  icon: SidePanelIcon;
};

export type SearchResultsSidePanelPage = {
  type: "search-results";
  instanceId: string;
  title: string;
  icon: SidePanelIcon;
  query: string;
};

export type SidePanelRecordObjectName =
  | "person"
  | "company"
  | "sale"
  | "lead"
  | "inventory";

export type RecordSidePanelPage = {
  type: "record";
  instanceId: string;
  title: string;
  icon: SidePanelIcon;
  objectName: SidePanelRecordObjectName;
  recordId: string;
  label?: string;
};

export type SidePanelPage =
  | RootSidePanelPage
  | SearchResultsSidePanelPage
  | RecordSidePanelPage;

export type SidePanelPageType = SidePanelPage["type"];

export function createRootSidePanelPage(): RootSidePanelPage {
  return {
    type: "root",
    instanceId: crypto.randomUUID(),
    title: "Menú de comandos",
    icon: Search,
  };
}

export function createSearchResultsSidePanelPage(
  query: string,
): SearchResultsSidePanelPage {
  return {
    type: "search-results",
    instanceId: crypto.randomUUID(),
    title: "Resultados de búsqueda",
    icon: Search,
    query,
  };
}

type CreateRecordSidePanelPageInput = {
  objectName: SidePanelRecordObjectName;
  recordId: string;
  title: string;
  icon: SidePanelIcon;
  label?: string;
};

export function createRecordSidePanelPage(
  input: CreateRecordSidePanelPageInput,
): RecordSidePanelPage {
  return {
    type: "record",
    instanceId: crypto.randomUUID(),
    objectName: input.objectName,
    recordId: input.recordId,
    title: input.title,
    icon: input.icon,
    label: input.label,
  };
}
