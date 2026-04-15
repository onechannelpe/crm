import { BootstrapWidget } from "./widgets/bootstrap";
import { FieldsWidget } from "./widgets/fields";
import { SunatWidget } from "./widgets/sunat";

import pageStyles from "./page.module.css";

type HomeTabContentProps = {
  razonSocial?: string | null;
  address?: string | null;
  engineStatus?: string;
  onSubmit?: () => void;
};

export function HomeTabContent(props: HomeTabContentProps) {
  return (
    <div class={pageStyles.homeContent}>
      <FieldsWidget razonSocial={props.razonSocial} address={props.address} />
      <BootstrapWidget
        engineStatus={props.engineStatus}
        onSubmit={props.onSubmit}
      />
      <SunatWidget />
    </div>
  );
}
