import type { InquiryState } from "~/contracts/workflow/vocabulary";

const INQUIRY_STATE_LABELS: Record<InquiryState, string> = {
  PENDING: "Pendiente",
  ANSWERED: "Respondida",
  CONVERTED: "Registrada",
};

export function inquiryStateLabel(state: InquiryState): string {
  return INQUIRY_STATE_LABELS[state];
}
