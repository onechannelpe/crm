import { type Component, createSignal, For } from "solid-js";
import { Button } from "~/presentation/ui/primitives/button";
import { Input } from "~/presentation/ui/primitives/input";
import { Select } from "~/presentation/ui/primitives/select";
import type { User } from "~/infrastructure/db/schema";

interface AllocateQuotaFormProps {
  executives: User[];
  onAllocate: (userId: number, amount: number) => Promise<void>;
}

export const AllocateQuotaForm: Component<AllocateQuotaFormProps> = (props) => {
  const [selectedUserId, setSelectedUserId] = createSignal<number | null>(null);
  const [amount, setAmount] = createSignal(10);
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async () => {
    const userId = selectedUserId();
    if (!userId) return;

    setLoading(true);
    try {
      await props.onAllocate(userId, amount());
      setSelectedUserId(null);
      setAmount(10);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <h3 class="font-semibold mb-4">Asignar Cuota</h3>
      <div class="space-y-4">
        <Select
          value={selectedUserId()?.toString() ?? ""}
          onChange={(value) => setSelectedUserId(Number(value))}
        >
          <option value="">Seleccionar ejecutivo</option>
          <For each={props.executives}>
            {(exec) => (
              <option value={exec.id}>
                {exec.full_name}
              </option>
            )}
          </For>
        </Select>

        <Input
          type="number"
          label="Cantidad de leads"
          value={amount().toString()}
          onInput={(value) => setAmount(Math.max(1, Math.min(100, Number(value))))}
        />

        <Button
          onClick={handleSubmit}
          disabled={!selectedUserId() || loading()}
          class="w-full"
        >
          {loading() ? "Asignando..." : "Asignar Cuota"}
        </Button>
      </div>
    </div>
  );
};
