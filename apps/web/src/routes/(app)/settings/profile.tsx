import { useAction, useSubmissions } from "@solidjs/router";
import { createSignal, onCleanup } from "solid-js";

import { updateUserProfile } from "~/actions/settings/profile";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/hooks/useSnackBar";
import { getUserInitials } from "~/components/layout/account-menu-utils";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { ProfileImageInput } from "~/components/settings/ProfileImageInput";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";
import {
  removeUserAvatarMutation,
  uploadUserAvatarMutation,
} from "~/lib/mutations/profile";
import { shortName } from "~/lib/users/display-name";

import styles from "./settings-page.module.css";

function toMessage(error: unknown, fallback: string): string {
  return getErrorMessage(error, fallback);
}

export default function ProfilePage() {
  const { currentUser, updateCurrentUser } = useAuthenticatedSession();
  const {
    enqueueSuccessSnackBar,
    enqueueErrorSnackBar,
    enqueueInfoSnackBar,
    enqueueWarningSnackBar,
  } = useSnackBar();
  const user = () => currentUser();

  const [profilePhone, setProfilePhone] = createSignal(user().phoneE164 || "");
  const [savingProfile, setSavingProfile] = createSignal(false);
  const [avatarUrl, setAvatarUrl] = createSignal(user().avatarUrl);
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
  const phoneFormId = "settings-profile-phone-form";

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
      await updateUserProfile(profilePhone());
      updateCurrentUser((existing) => ({
        ...existing,
        phoneE164: profilePhone(),
      }));
      enqueueSuccessSnackBar({ message: "Perfil actualizado" });
    } catch (err: unknown) {
      enqueueErrorSnackBar({
        message: toMessage(err, "No se pudo actualizar el perfil"),
      });
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
      enqueueSuccessSnackBar({ message: "Foto de perfil actualizada" });

      URL.revokeObjectURL(optimisticPreview);
      setAvatarPreviewUrl(null);
    } catch (error: unknown) {
      URL.revokeObjectURL(optimisticPreview);
      setAvatarPreviewUrl(null);

      const message = toMessage(error, "No se pudo subir la foto de perfil");
      setAvatarError(message);
      enqueueErrorSnackBar({ message: message });
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
      enqueueSuccessSnackBar({ message: "Foto de perfil eliminada" });
    } catch (error: unknown) {
      const message = toMessage(error, "No se pudo eliminar la foto de perfil");
      setAvatarError(message);
      enqueueErrorSnackBar({ message: message });
    }
  };

  return (
    <>
      <SettingsSection title="Foto">
        <ProfileImageInput
          pictureUrl={avatarPreviewUrl() ?? avatarUrl()}
          initials={getUserInitials(shortName(user()))}
          uploading={avatarMutationPending()}
          errorMessage={avatarError()}
          onUpload={uploadProfilePicture}
          onRemove={removeProfilePicture}
        />
      </SettingsSection>

      <SettingsSection
        title="Teléfono"
        description="Tu número de teléfono corporativo"
        actions={
          <Button
            type="submit"
            form={phoneFormId}
            size="sm"
            variant="secondary"
            loading={savingProfile()}
          >
            Guardar
          </Button>
        }
      >
        <form
          id={phoneFormId}
          onSubmit={(e) => {
            void saveProfile(e);
          }}
        >
          <div class={styles.formGrid}>
            <Input
              label="Teléfono"
              value={profilePhone()}
              onInput={(e) => setProfilePhone(e.currentTarget.value)}
              placeholder="+1 234 567 8900"
            />
          </div>
        </form>
      </SettingsSection>

      <SettingsSection
        title="Correo electrónico"
        description="El correo asociado a tu cuenta"
      >
        <Input value={user().email} disabled />
      </SettingsSection>
    </>
  );
}
