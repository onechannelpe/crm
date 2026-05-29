import type { LeadDetailView } from "~/contracts/workflow/views";
import { DetailFieldsWidget } from "~/features/side-panel/pages/record-page/widgets/fields";
import { SunatWidget } from "~/features/side-panel/pages/record-page/widgets/sunat";

type DataTabProps = {
  data: LeadDetailView;
};

export function DataTab(props: DataTabProps) {
  return (
    <>
      <DetailFieldsWidget data={props.data} />
      <SunatWidget data={props.data} />
    </>
  );
}
