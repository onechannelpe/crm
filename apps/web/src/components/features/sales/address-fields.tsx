import { Input } from "~/components/ui/input/input";
import type { SalesRecordFormState } from "~/lib/sales/use-sales-record-form";

interface Props {
  form: SalesRecordFormState;
}

export function AddressFields(props: Props) {
  return (
    <>
      <Input
        label="Dirección de instalación"
        value={props.form.installationAddress()}
        onInput={(e) =>
          props.form.setInstallationAddress(e.currentTarget.value)
        }
        required
      />
      <Input
        label="Dirección de facturación (opcional)"
        value={props.form.billingAddress()}
        onInput={(e) => props.form.setBillingAddress(e.currentTarget.value)}
      />
      <Input
        label="Dirección de referencia (opcional)"
        value={props.form.referenceAddress()}
        onInput={(e) => props.form.setReferenceAddress(e.currentTarget.value)}
      />
    </>
  );
}
