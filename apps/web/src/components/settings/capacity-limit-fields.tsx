import { Input } from "~/components/ui/input/input";

import styles from "./capacity-limit-fields.module.css";

export interface CapacityLimitsDraft {
  searchLimit: string;
  bufferTarget: string;
  dailyRefillLimit: string;
}

export function CapacityLimitFields(props: {
  draft: CapacityLimitsDraft;
  setValue: (key: keyof CapacityLimitsDraft, value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div class={styles.grid}>
      <Input
        type="number"
        label="Límite mensual de búsquedas"
        value={props.draft.searchLimit}
        onInput={(event) =>
          props.setValue("searchLimit", event.currentTarget.value)
        }
        disabled={props.disabled}
        required
      />
      <Input
        type="number"
        label="Límite de clientes activos"
        value={props.draft.bufferTarget}
        onInput={(event) =>
          props.setValue("bufferTarget", event.currentTarget.value)
        }
        disabled={props.disabled}
        required
      />
      <Input
        type="number"
        label="Límite diario de asignaciones"
        value={props.draft.dailyRefillLimit}
        onInput={(event) =>
          props.setValue("dailyRefillLimit", event.currentTarget.value)
        }
        disabled={props.disabled}
        required
      />
    </div>
  );
}
