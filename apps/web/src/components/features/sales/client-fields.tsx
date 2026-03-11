import { Input } from "~/components/ui/input/input";
import type { SalesRecordFormState } from "~/lib/sales/use-sales-record-form";

interface Props {
  form: SalesRecordFormState;
}

export function ClientFields(props: Props) {
  return (
    <>
      <Input
        label="RUC"
        value={props.form.ruc()}
        placeholder="20100200300"
        onInput={(e) => props.form.setRuc(e.currentTarget.value)}
      />
      <Input
        label="Empresa"
        value={props.form.companyName()}
        onInput={(e) => props.form.setCompanyName(e.currentTarget.value)}
        required
      />
      <Input
        label="Contacto"
        value={props.form.contactName()}
        onInput={(e) => props.form.setContactName(e.currentTarget.value)}
        required
      />
      <Input
        label="DNI"
        value={props.form.dni()}
        onInput={(e) => props.form.setDni(e.currentTarget.value)}
        required
      />
      <Input
        label="Teléfono"
        type="tel"
        value={props.form.phone()}
        onInput={(e) => props.form.setPhone(e.currentTarget.value)}
        placeholder="+51..."
      />
    </>
  );
}
