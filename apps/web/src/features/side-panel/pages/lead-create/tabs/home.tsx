import { BootstrapWidget } from "../widgets/bootstrap";
import { FieldsWidget } from "../widgets/fields";
import { SunatWidget } from "../widgets/sunat";

import pageStyles from "../page.module.css";

type HomeTabProps = {
  razonSocial?: string | null;
  address?: string | null;
  engineStatus?: string;
  onSubmit?: () => void;
};

export function HomeTab(props: HomeTabProps) {
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
