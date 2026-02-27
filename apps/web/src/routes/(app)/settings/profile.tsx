import { useAction, useSubmissions } from "@solidjs/router";
import { createSignal, onCleanup } from "solid-js";

import { updateUserProfile } from "~/actions/settings";
import { useToast } from "~/components/feedback/toast-provider";
import { getUserInitials } from "~/components/layout/account-menu-utils";
import { useSession } from "~/components/providers/session-provider";
import { ProfileImageInput } from "~/components/settings/ProfileImageInput";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";
import {
  removeUserAvatarMutation,
  uploadUserAvatarMutation,
} from "~/lib/mutations/profile";

import styles from "./settings-page.module.css";

function toMessage(error: unknown, fallback: string): string {
  return getErrorMessage(error, fallback);
}

export default function ProfilePage() {
  const { currentUser, updateCurrentUser } = useSession();
  const { showToast } = useToast();
  const user = () => currentUser();

  const [profileName, setProfileName] = createSignal(user().fullName || "");
  const [profilePhone, setProfilePhone] = createSignal(user().phoneE164 || "");
  const [savingProfile, setSavingProfile] = createSignal(false);
  const [avatarUrl, setAvatarUrl] = createSignal<string | null>(
    user().avatarUrl,
  );
  const [avatarPreviewUrl, setAvatarPreviewUrl] = createSignal<string | null>(
    null,
  );
  const [avatarError, setAvatarError] = createSignal<string | null>(null);

  const uploadAvatar = useAction(uploadUserAvatarMutation);
  const removeAvatar = useAction(removeUserAvatarMutation);
  const uploadSubmissions = useSubmissions(uploadUserAvatarMutation);
  const removeSubmissions = useSubmissions(removeUserAvatarMutation);

  const isUploadingAvatar = () =>
    uploadSubmissions.some((submission) => submission.pending);
  const isRemovingAvatar = () =>
    removeSubmissions.some((submission) => submission.pending);
  const avatarMutationPending = () => isUploadingAvatar() || isRemovingAvatar();

  onCleanup(() => {
    const preview = avatarPreviewUrl();
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  });

  const saveProfile = async (e: Event) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile(profileName(), profilePhone());
      updateCurrentUser((existing) => ({
        ...existing,
        fullName: profileName(),
        phoneE164: profilePhone(),
      }));
      showToast("success", "Perfil actualizado");
    } catch (err: unknown) {
      showToast("error", toMessage(err, "No se pudo actualizar el perfil"));
    } finally {
      setSavingProfile(false);
    }
  };

  const uploadProfilePicture = async (file: File) => {
    setAvatarError(null);

    const previousPreview = avatarPreviewUrl();
    if (previousPreview) {
      URL.revokeObjectURL(previousPreview);
    }

    const optimisticPreview = URL.createObjectURL(file);
    setAvatarPreviewUrl(optimisticPreview);

    try {
      const formData = new FormData();
      formData.set("file", file);
      const updated = await uploadAvatar(formData);

      setAvatarUrl(updated.avatarUrl);
      updateCurrentUser((existing) => ({
        ...existing,
        avatarUrl: updated.avatarUrl,
        avatarVersion: updated.avatarVersion,
      }));
      showToast("success", "Foto de perfil actualizada");

      URL.revokeObjectURL(optimisticPreview);
      setAvatarPreviewUrl(null);
    } catch (error: unknown) {
      URL.revokeObjectURL(optimisticPreview);
      setAvatarPreviewUrl(null);

      const message = toMessage(error, "No se pudo subir la foto de perfil");
      setAvatarError(message);
      showToast("error", message);
    }
  };

  const removeProfilePicture = async () => {
    setAvatarError(null);

    const previousPreview = avatarPreviewUrl();
    if (previousPreview) {
      URL.revokeObjectURL(previousPreview);
      setAvatarPreviewUrl(null);
    }

    try {
      const updated = await removeAvatar();
      setAvatarUrl(updated.avatarUrl);
      updateCurrentUser((existing) => ({
        ...existing,
        avatarUrl: null,
        avatarVersion: updated.avatarVersion,
      }));
      showToast("success", "Foto de perfil eliminada");
    } catch (error: unknown) {
      const message = toMessage(error, "No se pudo eliminar la foto de perfil");
      setAvatarError(message);
      showToast("error", message);
    }
  };

  return (
    <div class={styles.content}>
      <SettingsSection title="Foto">
        <ProfileImageInput
          pictureUrl={avatarPreviewUrl() ?? avatarUrl()}
          initials={getUserInitials(profileName() || user().email)}
          uploading={avatarMutationPending()}
          errorMessage={avatarError()}
          onUpload={uploadProfilePicture}
          onRemove={removeProfilePicture}
        />
      </SettingsSection>

      <SettingsSection title="Nombre" description="Tu nombre, tal como se mostrará">
        <form
          onSubmit={(e) => {
            void saveProfile(e);
          }}
        >
          <div class={styles.formGrid}>
            <Input
              label="Nombre completo"
              value={profileName()}
              onInput={(e) => setProfileName(e.currentTarget.value)}
              required
            />
            <Input
              label="Teléfono"
              value={profilePhone()}
              onInput={(e) => setProfilePhone(e.currentTarget.value)}
              placeholder="+1 234 567 8900"
            />
          </div>

          <div class={styles.formActions}>
            <Button type="submit" disabled={savingProfile()}>
              {savingProfile() ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </SettingsSection>

      <SettingsSection
        title="Correo electrónico"
        description="El correo asociado a tu cuenta"
      >
        <Input value={user().email} disabled />
      </SettingsSection>
    </div>
  );
}
