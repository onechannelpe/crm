import { RelationRow } from "~/features/side-panel/components/relation-list";
import {
  WidgetBody,
  Widget,
  WidgetActions,
  WidgetHeader,
  WidgetOptionsButton,
  WidgetTitle,
} from "~/features/side-panel/components/widget-card";

export function SunatWidget() {
  return (
    <Widget>
      <WidgetHeader>
        <WidgetTitle text="Verificación SUNAT" />
        <WidgetActions>
          <WidgetOptionsButton>...</WidgetOptionsButton>
        </WidgetActions>
      </WidgetHeader>
      <WidgetBody>
        <RelationRow>
          <span>Se encola al registrar el lead</span>
        </RelationRow>
      </WidgetBody>
    </Widget>
  );
}
