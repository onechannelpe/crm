import type { LeadDetailView } from "~/contracts/workflow/views";
import { DetailFieldsWidget } from "~/features/side-panel/pages/record-page/widgets/fields";
import { SunatWidget } from "~/features/side-panel/pages/record-page/widgets/sunat";

export function DataTab(props: { data: LeadDetailView }) {
  return (
    <>
      <DetailFieldsWidget data={props.data} />
      <SunatWidget data={props.data} />
    </>
  );
}
