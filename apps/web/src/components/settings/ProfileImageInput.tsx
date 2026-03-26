import { Show } from "solid-js";

import { Avatar } from "~/components/ui/display/avatar";
import { Button } from "~/components/ui/input/button";

import styles from "./profile-image-input.module.css";

interface ProfileImageInputProps {
  pictureUrl: string | null;
  initials: string;
  uploading: boolean;
  errorMessage?: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function ProfileImageInput(props: ProfileImageInputProps) {
  let inputRef: HTMLInputElement | null = null;

  const openFilePicker = () => {
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
        disabled={props.uploading}
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
            disabled={props.uploading}
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
              disabled={props.uploading}
            >
              Eliminar foto
            </button>
          </Show>
        </div>
        <p class={styles.helpText}>
          Admitimos imágenes en formato PNG, JPEG y GIF de hasta 5 MB.
        </p>
        <Show when={props.errorMessage}>
          {(message) => <p class={styles.errorText}>{message()}</p>}
        </Show>
      </div>
    </div>
  );
}
