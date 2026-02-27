import { Show } from "solid-js";

import { Button } from "~/components/ui/input/button";

import styles from "./profile-image-input.module.css";

interface ProfileImageInputProps {
  pictureUrl: string | null;
  initials: string;
  uploading: boolean;
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
        <Show
          when={props.pictureUrl}
          fallback={<span class={styles.initials}>{props.initials}</span>}
        >
          {(url) => (
            <img src={url()} alt="profile" class={styles.previewImage} />
          )}
        </Show>
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
            variant="outline"
            size="sm"
            onClick={openFilePicker}
            disabled={props.uploading}
          >
            {props.uploading ? "Uploading..." : "Upload"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void props.onRemove();
            }}
            disabled={props.uploading || !props.pictureUrl}
          >
            Remove
          </Button>
        </div>
        <p class={styles.helpText}>
          We support your square PNGs, JPEGs and GIFs under 10MB
        </p>
      </div>
    </div>
  );
}
