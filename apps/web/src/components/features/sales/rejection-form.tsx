import { type Component, For, createSignal } from "solid-js";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";

interface RejectionItem {
    fieldId: string;
    note: string;
}

interface RejectionFormProps {
    onReject: (rejections: RejectionItem[]) => Promise<void>;
    onCancel: () => void;
}

const REJECTABLE_FIELDS = [
    { id: "exec_code_real", label: "Código Ejecutivo Real" },
    { id: "exec_code_tdp", label: "Código Ejecutivo TDP" },
    { id: "items", label: "Productos/Items" },
    { id: "contact_info", label: "Información de Contacto" },
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
        <div class="space-y-4">
            <Select
                value=""
                onChange={(e) => {
                    const value = (e.target as HTMLSelectElement).value;
                    if (value) addRejection(value);
                }}
            >
                <option value="">Agregar campo...</option>
                <For each={availableFields()}>
                    {(field) => <option value={field.id}>{field.label}</option>}
                </For>
            </Select>

            <div class="space-y-3">
                <For each={rejections()}>
                    {(rejection, index) => {
                        const fieldLabel =
                            REJECTABLE_FIELDS.find((f) => f.id === rejection.fieldId)?.label;
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
                                    >
                                        ×
                                    </button>
                                </div>
                                <Input
                                    placeholder="Motivo del rechazo"
                                    value={rejection.note}
                                    onInput={(e) => updateNote(index(), (e.target as HTMLInputElement).value)}
                                />
                            </div>
                        );
                    }}
                </For>
            </div>

            <div class="flex gap-2 pt-2">
                <Button
                    variant="destructive"
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
};
