import { type LeadDetailView } from "~/contracts/workflow/views";

export type CreateTabContentProps = {
  mode: "create";
  ruc?: string;
  razonSocial?: string | null;
  address?: string | null;
  engineStatus?: string;
  canCreate: boolean;
  submitting?: boolean;
  onSubmit?: () => void;
};

export type ViewTabContentProps = {
  mode: "view";
  data: LeadDetailView;
};

export type TabContentProps = CreateTabContentProps | ViewTabContentProps;
