import { RelationRow } from "~/features/side-panel/components/relation-list";
import {
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
        <WidgetTitle>Verificación SUNAT</WidgetTitle>
        <WidgetActions>
          <WidgetOptionsButton>...</WidgetOptionsButton>
        </WidgetActions>
      </WidgetHeader>
      <RelationRow>
        <span>Se encola al registrar el lead</span>
      </RelationRow>
    </Widget>
  );
}
