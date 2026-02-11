import { createSignal, For } from "solid-js";
import Button from "../shared/button";
import Input from "../shared/input";

interface Rejection {
  fieldId: string;
  note: string;
}

interface RejectionFormProps {
  onReject: (rejections: Rejection[]) => Promise<void>;
  onCancel: () => void;
}

const REJECTABLE_FIELDS = [
  { id: "exec_code_real", label: "Código Ejecutivo Real" },
  { id: "exec_code_tdp", label: "Código Ejecutivo TDP" },
  { id: "items", label: "Productos/Items" },
  { id: "contact_info", label: "Información de Contacto" },
];

export default function RejectionForm(props: RejectionFormProps) {
  const [rejections, setRejections] = createSignal<Rejection[]>([]);
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const availableFields = () =>
    REJECTABLE_FIELDS.filter(
      (f) => !rejections().some((r) => r.fieldId === f.id),
    );

  return (
    <div class="space-y-4">
      <div>
        <label
          for="reject-field-select"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          Campos a rechazar
        </label>
        <select
          id="reject-field-select"
          onChange={(e) => {
            if (e.currentTarget.value) {
              addRejection(e.currentTarget.value);
              e.currentTarget.value = "";
            }
          }}
          class="w-full px-3 py-2 border border-gray-300 rounded"
        >
          <option value="">Agregar campo...</option>
          <For each={availableFields()}>
            {(field) => <option value={field.id}>{field.label}</option>}
          </For>
        </select>
      </div>

      <div class="space-y-3">
        <For each={rejections()}>
          {(rejection, index) => {
            const fieldLabel = REJECTABLE_FIELDS.find(
              (f) => f.id === rejection.fieldId,
            )?.label;
            return (
              <div class="border border-red-200 rounded-lg p-3 bg-red-50">
                <div class="flex items-start justify-between mb-2">
                  <span class="text-sm font-medium text-red-900">
                    {fieldLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRejection(index())}
                    class="text-red-600 hover:text-red-800"
                    title="Eliminar rechazo"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <title>Eliminar rechazo</title>
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                <Input
                  name={`rejection-${index()}`}
                  placeholder="Motivo del rechazo"
                  value={rejection.note}
                  onInput={(value) => updateNote(index(), value)}
                  required
                />
              </div>
            );
          }}
        </For>
      </div>

      <div class="flex gap-2 pt-2">
        <Button
          variant="danger"
          onClick={handleSubmit}
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
}
