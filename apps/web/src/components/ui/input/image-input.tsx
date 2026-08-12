import { Show } from "solid-js";

import { Avatar } from "~/components/ui/display/avatar";
import { Button } from "~/components/ui/input/button";

import styles from "./image-input.module.css";

interface ImageInputProps {
  pictureUrl: string | null;
  initials: string;
  uploading: boolean;
  errorMessage?: string | null;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function ImageInput(props: ImageInputProps) {
  let inputRef: HTMLInputElement | null = null;

  const isBusy = () => props.uploading || (props.disabled ?? false);

  const openFilePicker = () => {
    if (props.disabled) {
      return;
    }
    inputRef?.click();
  };

  const handleFileChange = async (event: Event) => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const selectedFile = target.files?.[0];
    if (!selectedFile) {
      return;
    }

    target.value = "";
    await props.onUpload(selectedFile);
  };

  return (
    <div class={styles.root}>
      <button
        type="button"
        class={styles.preview}
        onClick={openFilePicker}
        disabled={isBusy()}
      >
        <Avatar
          imageUrl={props.pictureUrl}
          fallback={props.initials}
          class={styles.previewAvatar}
          imageClass={styles.previewImage}
          fallbackClass={styles.initials}
        />
      </button>

      <div class={styles.controls}>
        <input
          ref={(element) => {
            inputRef = element;
          }}
          type="file"
          class={styles.fileInput}
          accept="image/jpeg,image/png,image/gif"
          onChange={(event) => {
            void handleFileChange(event);
          }}
        />
        <div class={styles.buttons}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={openFilePicker}
            loading={props.uploading}
            disabled={isBusy()}
          >
            Subir
          </Button>
          <Show when={props.pictureUrl}>
            <button
              type="button"
              class={styles.removeLink}
              onClick={() => {
                void props.onRemove();
              }}
              disabled={isBusy()}
            >
              Eliminar foto
            </button>
          </Show>
        </div>
        <p class={styles.helpText}>
          Admitimos imágenes en formato PNG, JPEG y GIF de hasta 10 MB.
        </p>
        <Show when={props.errorMessage}>
          {(message) => <p class={styles.errorText}>{message()}</p>}
        </Show>
      </div>
    </div>
  );
}
