import { createSignal, Show } from "solid-js";

import { Button } from "~/components/ui/input/button";
import {
  RecordDetailSection,
  RecordDetailSectionBody,
  RecordDetailSectionHeader,
  RecordDetailSectionTitle,
} from "~/features/side-panel/components/record-detail-section";

import { ReviewLeadModal } from "./review-modal";

export function ReviewSection(props: { leadId: string }) {
  const [open, setOpen] = createSignal(false);

  return (
    <RecordDetailSection>
      <RecordDetailSectionHeader>
        <RecordDetailSectionTitle text="Revisión" />
      </RecordDetailSectionHeader>
      <RecordDetailSectionBody>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Revisar cliente
        </Button>
      </RecordDetailSectionBody>

      <Show when={open()}>
        <ReviewLeadModal leadId={props.leadId} onClose={() => setOpen(false)} />
      </Show>
    </RecordDetailSection>
  );
}
