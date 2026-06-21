"use server";

import { beginPasskeyEnrollment } from "../security/passkey";

export const startPasskeyOnboardingStep = beginPasskeyEnrollment;
