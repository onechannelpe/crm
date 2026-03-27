import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePasskeyEnrollment } from "../../src/components/auth/security-enrollment/use-passkey-enrollment";

const {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  createRegistrationResponse,
  isPasskeyRegistrationSupported,
} = vi.hoisted(() => ({
  beginPasskeyRegistration: vi.fn(),
  finishPasskeyRegistration: vi.fn(),
  createRegistrationResponse: vi.fn(),
  isPasskeyRegistrationSupported: vi.fn(),
}));

vi.mock("../../src/actions/auth/onboarding/passkey", () => ({
  beginPasskeyRegistration,
  finishPasskeyRegistration,
}));

vi.mock("../../src/lib/auth/passkey/registration-client", () => ({
  createRegistrationResponse,
  isPasskeyRegistrationSupported,
}));

describe("usePasskeyEnrollment", () => {
  beforeEach(() => {
    beginPasskeyRegistration.mockResolvedValue({
      challengeId: "challenge-1",
      options: { challenge: "abc" },
    });
    finishPasskeyRegistration.mockResolvedValue(undefined);
    createRegistrationResponse.mockResolvedValue({ id: "credential-1" });
    isPasskeyRegistrationSupported.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the configured toast after registering a passkey", async () => {
    const showToast = vi.fn();
    const refreshStatus = vi.fn().mockResolvedValue(undefined);

    let dispose: () => void = () => undefined;
    const enrollment = createRoot((rootDispose) => {
      dispose = rootDispose;
      return usePasskeyEnrollment({
        showToast,
        refreshStatus,
        successMessage: "Clave de acceso añadida",
      });
    });

    await enrollment.registerPasskey();
    dispose();

    expect(beginPasskeyRegistration).toHaveBeenCalledOnce();
    expect(createRegistrationResponse).toHaveBeenCalledOnce();
    expect(finishPasskeyRegistration).toHaveBeenCalledOnce();
    expect(refreshStatus).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledWith(
      "success",
      "Clave de acceso añadida",
    );
  });

  it("shows the registration failure message when setup fails", async () => {
    const showToast = vi.fn();
    const refreshStatus = vi.fn();
    finishPasskeyRegistration.mockRejectedValue(new Error("boom"));

    let dispose: () => void = () => undefined;
    const enrollment = createRoot((rootDispose) => {
      dispose = rootDispose;
      return usePasskeyEnrollment({
        showToast,
        refreshStatus,
        failureMessage: "No se pudo añadir la clave de acceso",
      });
    });

    await enrollment.registerPasskey();
    dispose();

    expect(showToast).toHaveBeenCalledWith(
      "error",
      "No se pudo añadir la clave de acceso",
    );
  });
});
