import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

export type CreateTabContentProps = {
  mode: "create";
  ruc?: string;
  razonSocial?: string | null;
  address?: string | null;
  engineStatus?: string;
  canCreate: boolean;
  onSubmit?: () => void;
};

export type ViewTabContentProps = {
  mode: "view";
  data: LeadDetailView;
};

export type TabContentProps = CreateTabContentProps | ViewTabContentProps;
