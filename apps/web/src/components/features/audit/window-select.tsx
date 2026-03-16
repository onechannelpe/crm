import { For } from "solid-js";

import { Select } from "~/components/ui/input/select";

export const WINDOW_OPTIONS_DEFAULT = [
  { value: 15, label: "15 min" },
  { value: 60, label: "1 hora" },
  { value: 240, label: "4 horas" },
  { value: 1440, label: "24 horas" },
] as const;

export const WINDOW_OPTIONS_EXTENDED = [
  { value: 240, label: "4 horas" },
  { value: 1440, label: "24 horas" },
  { value: 10080, label: "7 días" },
  { value: 43200, label: "30 días" },
] as const;

interface WindowSelectProps {
  value: number;
  onInput: (value: number) => void;
  options?: ReadonlyArray<{ value: number; label: string }>;
}

export function WindowSelect(props: WindowSelectProps) {
  const options = () => props.options ?? WINDOW_OPTIONS_DEFAULT;
  return (
    <div style={{ width: "10rem" }}>
      <Select
        label="Ventana"
        value={props.value}
        onInput={(e) => props.onInput(Number(e.currentTarget.value))}
      >
        <For each={options()}>
          {(opt) => <option value={opt.value}>{opt.label}</option>}
        </For>
      </Select>
    </div>
  );
}
