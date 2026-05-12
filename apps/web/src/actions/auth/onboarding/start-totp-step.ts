"use server";

import { beginTotpEnrollment } from "../security/totp";

export const startTotpOnboardingStep = beginTotpEnrollment;
