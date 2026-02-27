import { createSignal } from "solid-js";

import { updateUserProfile } from "~/actions/settings";
import { useToast } from "~/components/feedback/toast-provider";
import { getUserInitials } from "~/components/layout/account-menu-utils";
import { useSession } from "~/components/providers/session-provider";
import { ProfileImageInput } from "~/components/settings/ProfileImageInput";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { getErrorMessage } from "~/lib/errors";

import styles from "./settings-page.module.css";

interface ProfilePictureMutationResponse {
  success: boolean;
  avatarVersion: number;
  avatarUrl: string | null;
}

async function readPictureMutationResponse(
  response: Response,
): Promise<ProfilePictureMutationResponse> {
  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("success" in data) ||
    !("avatarVersion" in data) ||
    !("avatarUrl" in data)
  ) {
    throw new Error("Unexpected profile picture response");
  }

  const typed = data as {
    success: unknown;
    avatarVersion: unknown;
    avatarUrl: unknown;
  };

  if (
    typeof typed.success !== "boolean" ||
    typeof typed.avatarVersion !== "number" ||
    !(typeof typed.avatarUrl === "string" || typed.avatarUrl === null)
  ) {
    throw new Error("Unexpected profile picture response");
  }

  return {
    success: typed.success,
    avatarVersion: typed.avatarVersion,
    avatarUrl: typed.avatarUrl,
  };
}

export default function ProfilePage() {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const user = () => currentUser();

  const [profileName, setProfileName] = createSignal(user().fullName || "");
  const [profilePhone, setProfilePhone] = createSignal(user().phoneE164 || "");
  const [savingProfile, setSavingProfile] = createSignal(false);
  const [avatarUrl, setAvatarUrl] = createSignal<string | null>(
    user().avatarUrl,
  );
  const [uploadingAvatar, setUploadingAvatar] = createSignal(false);

  const saveProfile = async (e: Event) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateUserProfile(profileName(), profilePhone());
      showToast("success", "Profile updated");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const uploadProfilePicture = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/settings/profile/picture", {
        method: "POST",
        body: formData,
      });
      const payload = await readPictureMutationResponse(response);
      setAvatarUrl(payload.avatarUrl);
      showToast("success", "Profile picture updated");
    } catch (error: unknown) {
      showToast(
        "error",
        getErrorMessage(error, "Failed to upload profile picture"),
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeProfilePicture = async () => {
    setUploadingAvatar(true);
    try {
      const response = await fetch("/api/settings/profile/picture", {
        method: "DELETE",
      });
      const payload = await readPictureMutationResponse(response);
      setAvatarUrl(payload.avatarUrl);
      showToast("success", "Profile picture removed");
    } catch (error: unknown) {
      showToast(
        "error",
        getErrorMessage(error, "Failed to remove profile picture"),
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div class={styles.content}>
      <SettingsSection title="Picture">
        <ProfileImageInput
          pictureUrl={avatarUrl()}
          initials={getUserInitials(profileName() || user().email)}
          uploading={uploadingAvatar()}
          onUpload={uploadProfilePicture}
          onRemove={removeProfilePicture}
        />
      </SettingsSection>

      <SettingsSection
        title="Name"
        description="Your name as it will be displayed"
      >
        <form
          onSubmit={(e) => {
            void saveProfile(e);
          }}
        >
          <div class={styles.formGrid}>
            <Input
              label="Full name"
              value={profileName()}
              onInput={(e) => setProfileName(e.currentTarget.value)}
              required
            />
            <Input
              label="Phone"
              value={profilePhone()}
              onInput={(e) => setProfilePhone(e.currentTarget.value)}
              placeholder="+1 234 567 8900"
            />
          </div>

          <div class={styles.formActions}>
            <Button type="submit" disabled={savingProfile()}>
              {savingProfile() ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </SettingsSection>

      <SettingsSection
        title="Email"
        description="The email associated to your account"
      >
        <Input value={user().email} disabled />
      </SettingsSection>
    </div>
  );
}
