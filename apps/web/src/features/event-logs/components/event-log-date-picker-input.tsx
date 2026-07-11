import { DatePicker } from "~/components/ui/date-picker/date-picker-field";
import {
  formatIsoDate,
  parseIsoDate,
} from "~/components/ui/date-picker/date-picker-model";

type EventLogDatePickerInputProps = {
  label?: string;
  value: Date | undefined;
  placeholder?: string;
  onChange: (date: Date | undefined) => void;
};

export function EventLogDatePickerInput(props: EventLogDatePickerInputProps) {
  return (
    <DatePicker
      label={props.label}
      placeholder={props.placeholder}
      value={props.value ? formatIsoDate(props.value) : ""}
      onInput={(iso) =>
        props.onChange(iso ? (parseIsoDate(iso) ?? undefined) : undefined)
      }
    />
  );
}
