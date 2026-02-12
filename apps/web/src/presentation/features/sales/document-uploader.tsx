import { type Component, createSignal } from "solid-js";
import { Button } from "~/presentation/ui/primitives/button";
import { useToast } from "~/presentation/ui/feedback/toast-provider";

interface DocumentUploaderProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export const DocumentUploader: Component<DocumentUploaderProps> = (props) => {
  const [loading, setLoading] = createSignal(false);
  const { showToast } = useToast();
  let fileInputRef: HTMLInputElement | undefined;

  const handleFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("error", "El archivo no puede superar 10MB");
      return;
    }

    setLoading(true);
    try {
      await props.onUpload(file);
      showToast("success", "Documento cargado correctamente");
      input.value = "";
    } catch (error) {
      showToast("error", "Error al cargar documento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        class="hidden"
        onChange={handleFileChange}
        disabled={props.disabled}
      />
      <Button
        onClick={() => fileInputRef?.click()}
        disabled={loading() || props.disabled}
        variant="secondary"
      >
        {loading() ? "Cargando..." : "Seleccionar archivo"}
      </Button>
      <p class="text-sm text-gray-500 mt-2">
        PDF, JPG o PNG (máx. 10MB)
      </p>
    </div>
  );
};
