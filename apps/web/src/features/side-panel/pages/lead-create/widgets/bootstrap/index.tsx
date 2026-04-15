import Plus from "~/components/icons/plus";
import {
  PlusButton,
  RelationRow,
} from "~/features/side-panel/components/relation-list";
import {
  Widget,
  WidgetActions,
  WidgetHeader,
  WidgetOptionsButton,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";

type BootstrapWidgetProps = {
  engineStatus?: string;
  onSubmit?: () => void;
};

export function BootstrapWidget(props: BootstrapWidgetProps) {
  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle>Bootstrap desde Engine</WidgetTitle>
        <WidgetActions>
          <WidgetOptionsButton>...</WidgetOptionsButton>
        </WidgetActions>
      </WidgetHeader>
      <RelationRow>
        <span>{props.engineStatus ?? ""}</span>
        <PlusButton onClick={props.onSubmit}>
          <Plus size={14} />
        </PlusButton>
      </RelationRow>
    </Widget>
  );
}
