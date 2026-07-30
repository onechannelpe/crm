import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePasskeyEnrollment } from "~/features/auth/security/use-passkey-enrollment";
import { ActionError } from "~/lib/wire-error";

const {
  beginPasskeyEnrollment,
  finishPasskeyEnrollment,
  createRegistrationResponse,
  isPasskeyRegistrationSupported,
} = vi.hoisted(() => ({
  beginPasskeyEnrollment:
    vi.fn<
      () => Promise<{ challengeId: string; options: { challenge: string } }>
    >(),
  finishPasskeyEnrollment:
    vi.fn<() => Promise<{ message: string; recoveryCodes: string[] }>>(),
  createRegistrationResponse: vi.fn<() => Promise<{ id: string }>>(),
  isPasskeyRegistrationSupported: vi.fn<() => boolean>(),
}));

vi.mock("~/actions/auth/security/passkey.action", () => ({
  beginPasskeyEnrollment,
  finishPasskeyEnrollment,
}));

vi.mock("~/lib/auth/passkey/registration-client", () => ({
  createRegistrationResponse,
  isPasskeyRegistrationSupported,
}));

function noopDispose(): void {
  return undefined;
}

describe("usePasskeyEnrollment", () => {
  beforeEach(() => {
    beginPasskeyEnrollment.mockResolvedValue({
      challengeId: "challenge-1",
      options: { challenge: "abc" },
    });
    finishPasskeyEnrollment.mockResolvedValue({
      message: "Clave de acceso configurada",
      recoveryCodes: [],
    });
    createRegistrationResponse.mockResolvedValue({ id: "credential-1" });
    isPasskeyRegistrationSupported.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the configured toast after registering a passkey", async () => {
    const enqueueSuccessSnackBar = vi.fn<(message: string) => void>();
    const enqueueErrorSnackBar = vi.fn<(message: string) => void>();
    const refreshStatus = vi
      .fn<() => Promise<void>>()
      .mockResolvedValue(undefined);

    let dispose: () => void = noopDispose;
    const enrollment = createRoot((rootDispose) => {
      dispose = rootDispose;
      return usePasskeyEnrollment({
        enqueueSuccessSnackBar,
        enqueueErrorSnackBar,
        refreshStatus,
      });
    });

    await enrollment.enrollPasskey();
    dispose();

    expect(beginPasskeyEnrollment).toHaveBeenCalledOnce();
    expect(createRegistrationResponse).toHaveBeenCalledOnce();
    expect(finishPasskeyEnrollment).toHaveBeenCalledOnce();
    expect(refreshStatus).toHaveBeenCalledOnce();
    expect(enqueueSuccessSnackBar).toHaveBeenCalledWith(
      "Clave de acceso configurada",
    );
  });

  it("shows the registration failure message when setup fails", async () => {
    const enqueueSuccessSnackBar = vi.fn<(message: string) => void>();
    const enqueueErrorSnackBar = vi.fn<(message: string) => void>();
    const refreshStatus = vi.fn<() => void>();
    finishPasskeyEnrollment.mockRejectedValue(
      new ActionError({
        kind: "validation",
        code: "invalid_passkey_request",
        message: "La solicitud de acceso no es válida.",
      }),
    );

    let dispose: () => void = noopDispose;
    const enrollment = createRoot((rootDispose) => {
      dispose = rootDispose;
      return usePasskeyEnrollment({
        enqueueSuccessSnackBar,
        enqueueErrorSnackBar,
        refreshStatus,
      });
    });

    await enrollment.enrollPasskey();
    dispose();

    expect(enqueueErrorSnackBar).toHaveBeenCalledWith(
      "La solicitud de acceso no es válida.",
    );
  });
});
