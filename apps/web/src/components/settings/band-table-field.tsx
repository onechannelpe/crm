import { For } from "solid-js";

import Plus from "~/components/icons/plus";
import Trash from "~/components/icons/trash";
import { Button } from "~/components/ui/input/button";
import { LightIconButton } from "~/components/ui/input/light-icon-button";
import { TextInput } from "~/components/ui/input/text-input";
import type { PayoutBand } from "~/domain/merchant-stats/commission";

import styles from "./band-table-field.module.css";

interface BandTableFieldProps {
  bands: PayoutBand[];
  onChange: (bands: PayoutBand[]) => void;
}

export function parseNumber(raw: string): number {
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function parseOptionalNumber(raw: string): number | null {
  if (raw.trim() === "") {
    return null;
  }
  return parseNumber(raw);
}

// Only two rule shapes in the commission scheme repeat as a table (mass
// market Caja 1's M0+15 bands and Caja 2's gpv bands) -- everything else is
// scalar. Built once, reused at both call sites; not a general policy-table
// framework.
export function BandTableField(props: BandTableFieldProps) {
  function update(index: number, patch: Partial<PayoutBand>) {
    props.onChange(
      props.bands.map((band, i) =>
        i === index ? { ...band, ...patch } : band,
      ),
    );
  }

  function addBand() {
    const last = props.bands.at(-1);
    const nextMin = last ? (last.max ?? last.min) + 1 : 0;
    props.onChange([...props.bands, { min: nextMin, max: null, payout: null }]);
  }

  function removeBand(index: number) {
    props.onChange(props.bands.filter((_, i) => i !== index));
  }

  return (
    <div class={styles.table}>
      <div class={styles.header}>
        <span>Mínimo</span>
        <span>Máximo</span>
        <span>Pago</span>
        <span class={styles.headerSpacer} />
      </div>

      <For each={props.bands}>
        {(band, index) => (
          <div class={styles.row}>
            <TextInput
              type="number"
              sizeVariant="sm"
              aria-label="Mínimo del rango"
              value={String(band.min)}
              onChange={(value) => update(index(), { min: parseNumber(value) })}
            />
            <TextInput
              type="number"
              sizeVariant="sm"
              aria-label="Máximo del rango"
              placeholder="Sin máximo"
              value={band.max === null ? "" : String(band.max)}
              onChange={(value) =>
                update(index(), { max: parseOptionalNumber(value) })
              }
            />
            <TextInput
              type="number"
              sizeVariant="sm"
              aria-label="Pago del rango"
              placeholder="Pendiente"
              value={band.payout === null ? "" : String(band.payout)}
              onChange={(value) =>
                update(index(), { payout: parseOptionalNumber(value) })
              }
            />
            <LightIconButton
              Icon={Trash}
              accent="secondary"
              aria-label="Eliminar rango"
              onClick={() => removeBand(index())}
            />
          </div>
        )}
      </For>

      <Button type="button" variant="secondary" size="sm" onClick={addBand}>
        <Plus size={14} />
        Agregar rango
      </Button>
    </div>
  );
}
