import { SidePanelList } from "../../components/side-panel-list";
import { SidePanelPageInfoLayout } from "../../top-bar/side-panel-page-info-layout";
import type { RecordSidePanelPage } from "../../types/side-panel-page";

import styles from "../root/side-panel-root-page.module.css";

type SidePanelRecordPageProps = {
  page: RecordSidePanelPage;
};

export function SidePanelRecordPage(props: SidePanelRecordPageProps) {
  return (
    <SidePanelList>
      <div class={styles.emptyState}>
        {`El detalle de ${props.page.objectName} ${props.page.recordId} se renderizará aquí en un próximo PR.`}
      </div>
    </SidePanelList>
  );
}

export function SidePanelRecordPageInfo(props: SidePanelRecordPageProps) {
  return (
    <SidePanelPageInfoLayout
      icon={<props.page.icon size={14} />}
      title={<>{props.page.title}</>}
      label={props.page.label}
    />
  );
}
