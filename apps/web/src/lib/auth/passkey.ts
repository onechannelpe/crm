import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
    type RegistrationResponseJSON,
    type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import type { Repositories } from "~/server/shared/registry";
import { env } from "~/lib/env";

const rpName = "CRM OneChannel";
const rpID = env.webauthnRpId;
const origin = env.webauthnOrigin;

export function createPasskeyService(repos: Repositories) {
    return {
        async getRegistrationOptions(userId: number) {
            const existingPasskeys = await repos.passkeys.findByUser(userId);

            const options = await generateRegistrationOptions({
                rpName,
                rpID,
                userName: `user-${userId}`,
                excludeCredentials: existingPasskeys.map((p) => ({
                    id: p.id,
                    transports: p.transports ? JSON.parse(p.transports) : undefined,
                })),
                authenticatorSelection: {
                    residentKey: "preferred",
                    userVerification: "preferred",
                },
            });

            await repos.auditLogs.create({
                user_id: userId,
                action: "passkey_registration_started",
                entity_type: "passkey",
                entity_id: userId,
                changes: null,
                created_at: Date.now(),
            });

            return options;
        },

        async verifyRegistration(userId: number, response: RegistrationResponseJSON, challenge: string) {
            const verification = await verifyRegistrationResponse({
                response,
                expectedChallenge: challenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
            });

            if (!verification.verified || !verification.registrationInfo) {
                throw new Error("Registration verification failed");
            }

            const { credential } = verification.registrationInfo;
            await repos.passkeys.create({
                id: credential.id,
                user_id: userId,
                public_key: Buffer.from(credential.publicKey).toString("base64"),
                counter: credential.counter,
                transports: response.response.transports
                    ? JSON.stringify(response.response.transports)
                    : null,
            });

            return { verified: true };
        },

        async getAuthenticationOptions(userId?: number) {
            const allowCredentials = userId
                ? (await repos.passkeys.findByUser(userId)).map((p) => ({
                    id: p.id,
                    transports: p.transports ? JSON.parse(p.transports) : undefined,
                }))
                : [];

            return generateAuthenticationOptions({
                rpID,
                allowCredentials,
                userVerification: "preferred",
            });
        },

        async verifyAuthentication(response: AuthenticationResponseJSON, challenge: string) {
            const passkey = await repos.passkeys.findById(response.id);
            if (!passkey) throw new Error("Passkey not found");

            const verification = await verifyAuthenticationResponse({
                response,
                expectedChallenge: challenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                credential: {
                    id: passkey.id,
                    publicKey: Buffer.from(passkey.public_key, "base64"),
                    counter: passkey.counter,
                    transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
                },
            });

            if (!verification.verified) {
                throw new Error("Authentication verification failed");
            }

            await repos.passkeys.updateCounter(passkey.id, verification.authenticationInfo.newCounter);

            return { verified: true, userId: passkey.user_id };
        },
    };
}
