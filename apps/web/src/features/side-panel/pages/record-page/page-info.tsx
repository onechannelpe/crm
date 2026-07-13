import { createAsync } from "@solidjs/router";
import { Show } from "solid-js";

import { Tag } from "~/components/ui/tag/tag";
import { leadDetailQuery } from "~/features/workflow/data/queries";
import {
  leadStageColor,
  leadStageLabel,
} from "~/features/workflow/presentation/lead-display";

import { PageInfoLayout } from "../../top-bar/page-info-layout";
import { useLeadRecordPageState } from "./state";

export function RecordPageInfo() {
  const { pageState, leadId } = useLeadRecordPageState();
  const detail = createAsync(() => leadDetailQuery(leadId()));

  return (
    <PageInfoLayout
      title={pageState().title}
      badge={
        <Show when={detail()} keyed>
          {(data) => (
            <Tag
              color={leadStageColor(data.lead.stage)}
              text={leadStageLabel(data.lead.stage)}
              preventShrink
            />
          )}
        </Show>
      }
    />
  );
}
