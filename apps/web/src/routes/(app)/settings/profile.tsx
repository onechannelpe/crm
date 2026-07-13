import { useAction, useSubmissions } from "@solidjs/router";
import { createSignal, onCleanup } from "solid-js";

import { updateUserProfile } from "~/actions/settings/profile";
import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { getUserInitials } from "~/components/layout/account-menu-utils";
import { useAuthenticatedSession } from "~/components/providers/authenticated-session-provider";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { ImageInput } from "~/components/ui/input/image-input";
import { Input } from "~/components/ui/input/input";
import {
  removeUserAvatarMutation,
  uploadUserAvatarMutation,
} from "~/lib/mutations/profile";
import { isValidPhone, normalizePhoneInput } from "~/lib/phone/pe-mobile";
import { shortName } from "~/lib/users/display-name";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./settings-page.module.css";

export default function ProfilePage() {
  const { currentUser, updateCurrentUser } = useAuthenticatedSession();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const user = () => currentUser();

  const [profilePhone, setProfilePhone] = createSignal(user().phone || "");
  const [savingProfile, setSavingProfile] = createSignal(false);
  const [avatarUrl, setAvatarUrl] = createSignal(user().avatarUrl);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = createSignal<string | null>(
    null,
  );
  const [avatarErrorMessage, setAvatarErrorMessage] = createSignal<
    string | null
  >(null);

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

  function clearAvatarPreview() {
    const preview = avatarPreviewUrl();

    if (preview) {
      URL.revokeObjectURL(preview);
      setAvatarPreviewUrl(null);
    }
  }

  onCleanup(clearAvatarPreview);

  const savePhone = async (event: SubmitEvent) => {
    event.preventDefault();

    const localPhone = normalizePhoneInput(profilePhone());
    setProfilePhone(localPhone);

    if (!isValidPhone(localPhone)) {
      enqueueErrorSnackBar("Ingresa 9 dígitos y que empiece con 9");
      return;
    }

    setSavingProfile(true);

    try {
      const { message } = await updateUserProfile(localPhone);

      updateCurrentUser((existing) => ({
        ...existing,
        phone: localPhone,
      }));

      enqueueSuccessSnackBar(message);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarErrorMessage(null);
    clearAvatarPreview();

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
      enqueueSuccessSnackBar(updated.message);
      clearAvatarPreview();
    } catch (caught: unknown) {
      clearAvatarPreview();

      const message = actionErrorMessage(caught);
      setAvatarErrorMessage(message);
      enqueueErrorSnackBar(message);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarErrorMessage(null);
    clearAvatarPreview();

    try {
      const updated = await removeAvatar();

      setAvatarUrl(updated.avatarUrl);
      updateCurrentUser((existing) => ({
        ...existing,
        avatarUrl: null,
        avatarVersion: updated.avatarVersion,
      }));
      enqueueSuccessSnackBar(updated.message);
    } catch (caught: unknown) {
      const message = actionErrorMessage(caught);
      setAvatarErrorMessage(message);
      enqueueErrorSnackBar(message);
    }
  };

  return (
    <>
      <SettingsSection title="Foto">
        <ImageInput
          pictureUrl={avatarPreviewUrl() ?? avatarUrl()}
          initials={getUserInitials(shortName(user()))}
          uploading={avatarMutationPending()}
          errorMessage={avatarErrorMessage()}
          onUpload={handleAvatarUpload}
          onRemove={handleAvatarRemove}
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
          onSubmit={(event) => {
            void savePhone(event);
          }}
        >
          <div class={styles.formGrid}>
            <Input
              label="Teléfono"
              value={profilePhone()}
              onInput={(event) =>
                setProfilePhone(normalizePhoneInput(event.currentTarget.value))
              }
              placeholder="987654321"
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
