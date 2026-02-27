import { type Component, createSignal, Show } from "solid-js";

import { useToast } from "~/components/feedback/toast-provider";
import LoaderCircle from "~/components/icons/loader-circle";
import Plus from "~/components/icons/plus";
import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from "~/components/ui/input/button";

interface RequestLeadsButtonProps {
  onRequest: () => Promise<number>;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  class?: string;
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
        showToast(
          "success",
          assigned === 1 ? "1 lead asignado" : `${assigned} leads asignados`,
        );
      } else {
        showToast("error", "No hay más leads disponibles");
      }
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "No se pudo conectar con el servidor"
          : error instanceof Error
            ? error.message
            : "No se pudieron solicitar los leads";
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={props.variant || "primary"}
      size={props.size || "md"}
      class={props.class}
      onClick={() => {
        void handleClick();
      }}
      disabled={loading() || props.disabled}
    >
      <Show when={loading()} fallback={<Plus size={16} />}>
        <LoaderCircle size={16} class="animate-spin" />
      </Show>
    </Button>
  );
};
