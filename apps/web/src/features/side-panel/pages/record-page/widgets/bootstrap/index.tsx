import Plus from "~/components/icons/plus";
import {
  PlusButton,
  RelationRow,
} from "~/features/side-panel/components/relation-list";
import {
  WidgetBody,
  Widget,
  WidgetActions,
  WidgetHeader,
  WidgetOptionsButton,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";

type BootstrapWidgetProps = {
  engineStatus?: string;
  onSubmit?: () => void;
  submitting?: boolean;
};

export function BootstrapWidget(props: BootstrapWidgetProps) {
  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Bootstrap (engine)" />
        <WidgetActions>
          <WidgetOptionsButton>...</WidgetOptionsButton>
        </WidgetActions>
      </WidgetHeader>
      <WidgetBody>
        <RelationRow>
          <span>{props.engineStatus ?? ""}</span>
          <PlusButton onClick={props.onSubmit} disabled={props.submitting}>
            <Plus size={14} />
          </PlusButton>
        </RelationRow>
      </WidgetBody>
    </Widget>
  );
}
