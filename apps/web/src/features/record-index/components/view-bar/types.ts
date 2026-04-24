export type MenuOption = {
  label: string;
  value: string;
};

export type FilterFieldId = "modified" | "stage" | "status";
export type SortFieldPrefix = "createdAt" | "updatedAt" | "registeredBy" | "ruc";
export type SortDirection = "asc" | "desc";
export type OptionsContentId = "menu" | "fields";
