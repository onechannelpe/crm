import { type Component, Show } from "solid-js";

import { useToast } from "~/components/feedback/toast-provider";
import LoaderCircle from "~/components/icons/loader-circle";
import Plus from "~/components/icons/plus";
import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from "~/components/ui/input/button";
import { useAsyncAction } from "~/hooks/use-async-action";

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
  const { showToast } = useToast();

  const [requestLeads, isRequesting] = useAsyncAction(async () => {
    try {
      const assigned = await props.onRequest();
      if (assigned > 0) {
        showToast(
          "success",
          assigned === 1
            ? "1 lead agregado a tu cola"
            : `${assigned} leads agregados a tu cola`,
        );
      } else {
        showToast("error", "No se agregaron leads. Revisa tu capacidad.");
      }
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "No se pudo conectar con el servidor"
          : error instanceof Error
            ? error.message
            : "No se pudieron solicitar los leads";
      showToast("error", message);
    }
  });

  return (
    <Button
      variant={props.variant || "primary"}
      size={props.size || "md"}
      class={props.class}
      onClick={() => {
        void requestLeads();
      }}
      disabled={isRequesting() || props.disabled}
    >
      <Show when={isRequesting()} fallback={<Plus size={16} />}>
        <LoaderCircle size={16} class="animate-spin" />
      </Show>
    </Button>
  );
};
