export type LeadDomainEvent =
  | {
      type: "lead_registered";
      leadId: number;
      actorId: number;
      ruc: string;
      toStage: "PENDING_EXTERNAL_REVIEW";
    }
  | {
      type: "lead_needs_executive_input";
      leadId: number;
      executiveId: number;
      ruc: string;
    }
  | {
      type: "lead_ready_for_quotation";
      leadId: number;
      branchId: number;
      ruc: string;
    }
  | {
      type: "lead_ready_for_sale";
      leadId: number;
      executiveId: number;
      ruc: string;
    };
