import { type Component, createSignal, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { useToast } from "~/components/feedback/toast-provider";

interface RequestLeadsButtonProps {
    onRequest: () => Promise<void>;
    disabled?: boolean;
}

export const RequestLeadsButton: Component<RequestLeadsButtonProps> = (props) => {
    const [loading, setLoading] = createSignal(false);
    const { showToast } = useToast();

    const handleClick = async () => {
        setLoading(true);
        try {
            await props.onRequest();
            showToast("success", "Leads asignados correctamente");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error al solicitar leads";
            showToast("error", message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleClick}
            disabled={loading() || props.disabled}
        >
            <Show when={loading()} fallback="Solicitar leads">
                Solicitando...
            </Show>
        </Button>
    );
};
