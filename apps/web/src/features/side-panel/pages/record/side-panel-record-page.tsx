import { SidePanelList } from "../../components/side-panel-list";
import type { RecordSidePanelPage } from "../../types/side-panel-page";
import { SidePanelEmptyState } from "../common/side-panel-empty-state";

type SidePanelRecordPageProps = {
  page: RecordSidePanelPage;
};

export function SidePanelRecordPage(props: SidePanelRecordPageProps) {
  return (
    <SidePanelList>
      <SidePanelEmptyState>
        {`El detalle de ${props.page.objectName} ${props.page.recordId} se renderizará aquí en un próximo PR.`}
      </SidePanelEmptyState>
    </SidePanelList>
  );
}
