import { SidePanelPageInfoLayout } from "../../top-bar/side-panel-page-info-layout";
import type { RecordSidePanelPage } from "../../types/side-panel-page";

type SidePanelRecordPageInfoProps = {
  page: RecordSidePanelPage;
};

export function SidePanelRecordPageInfo(props: SidePanelRecordPageInfoProps) {
  return (
    <SidePanelPageInfoLayout
      icon={<props.page.icon size={14} />}
      title={<>{props.page.title}</>}
      label={props.page.label}
    />
  );
}
