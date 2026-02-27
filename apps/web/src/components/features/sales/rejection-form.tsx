import { type Component, For, createSignal } from "solid-js";

import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";

import styles from "./rejection-form.module.css";

interface RejectionItem {
  fieldId: string;
  note: string;
}

interface RejectionFormProps {
  onReject: (rejections: RejectionItem[]) => Promise<void>;
  onCancel: () => void;
}

const REJECTABLE_FIELDS = [
  { id: "exec_code_real", label: "Código de ejecutivo (real)" },
  { id: "exec_code_tdp", label: "Código de ejecutivo (TDP)" },
  { id: "items", label: "Artículos" },
  { id: "contact_info", label: "Información de contacto" },
];

export const RejectionForm: Component<RejectionFormProps> = (props) => {
  const [rejections, setRejections] = createSignal<RejectionItem[]>([]);
  const [loading, setLoading] = createSignal(false);

  const addRejection = (fieldId: string) => {
    setRejections([...rejections(), { fieldId, note: "" }]);
  };

  const updateNote = (index: number, note: string) => {
    const updated = [...rejections()];
    updated[index].note = note;
    setRejections(updated);
  };

  const removeRejection = (index: number) => {
    setRejections(rejections().filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const valid = rejections().every((r) => r.note.trim());
    if (!valid) return;

    setLoading(true);
    try {
      await props.onReject(rejections());
    } finally {
      setLoading(false);
    }
  };

  const availableFields = () =>
    REJECTABLE_FIELDS.filter(
      (f) => !rejections().some((r) => r.fieldId === f.id),
    );

  return (
    <div class={styles.root}>
      <Select
        value=""
        onChange={(e) => {
          const value = e.currentTarget.value;
          if (value) addRejection(value);
        }}
      >
        <option value="">Añadir campo...</option>
        <For each={availableFields()}>
          {(field) => <option value={field.id}>{field.label}</option>}
        </For>
      </Select>

      <div class={styles.list}>
        <For each={rejections()}>
          {(rejection, index) => {
            const fieldLabel = REJECTABLE_FIELDS.find(
              (f) => f.id === rejection.fieldId,
            )?.label;
            return (
              <div class={styles.item}>
                <div class={styles.itemHead}>
                  <span class={styles.itemTitle}>{fieldLabel}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRejection(index())}
                    class={styles.remove}
                  >
                    ×
                  </Button>
                </div>
                <Input
                  placeholder="Motivo del rechazo"
                  value={rejection.note}
                  onInput={(e) => updateNote(index(), e.currentTarget.value)}
                />
              </div>
            );
          }}
        </For>
      </div>

      <div class={styles.actions}>
        <Button
          variant="destructive"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={rejections().length === 0 || loading()}
        >
          {loading() ? "Rechazando..." : `Rechazar (${rejections().length})`}
        </Button>
        <Button variant="secondary" onClick={props.onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};
