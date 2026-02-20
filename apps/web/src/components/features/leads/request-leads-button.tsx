import { type Component, createSignal, Show } from "solid-js";

import { useToast } from "~/components/feedback/toast-provider";
import { Button } from "~/components/ui/input/button";

interface RequestLeadsButtonProps {
  onRequest: () => Promise<number>;
  disabled?: boolean;
}

export const RequestLeadsButton: Component<RequestLeadsButtonProps> = (
  props,
) => {
  const [loading, setLoading] = createSignal(false);
  const { showToast } = useToast();

  const handleClick = async () => {
    setLoading(true);
    try {
      const assigned = await props.onRequest();
      if (assigned > 0) {
        showToast("success", `${assigned} leads asignados`);
      } else {
        showToast("error", "No se encontraron leads nuevos para asignar");
      }
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "No se pudo conectar con el servidor"
          : error instanceof Error
            ? error.message
            : "Error al solicitar leads";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={() => {
        void handleClick();
      }}
      disabled={loading() || props.disabled}
    >
      <Show when={loading()} fallback="Solicitar leads">
        Solicitando...
      </Show>
    </Button>
  );
};
