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
        showToast("success", `${assigned} leads assigned`);
      } else {
        showToast("error", "No additional leads available");
      }
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "Could not connect to server"
          : error instanceof Error
            ? error.message
            : "Failed to request leads";
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
