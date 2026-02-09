import { sha256 } from "@oslojs/crypto/sha2";
import {
	encodeBase32LowerCaseNoPadding,
	encodeHexLowerCase,
} from "@oslojs/encoding";
import { db } from "../../db/client";
import type { Session } from "../../db/schema";

const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	return encodeBase32LowerCaseNoPadding(bytes);
}

export async function createSession(
	token: string,
	userId: number,
): Promise<Session> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const expiresAt = Date.now() + SESSION_MAX_AGE;

	await db
		.insertInto("sessions")
		.values({ id: sessionId, user_id: userId, expires_at: expiresAt })
		.execute();

	return { id: sessionId, user_id: userId, expires_at: expiresAt };
}

export async function validateSessionToken(token: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const result = await db
		.selectFrom("sessions")
		.innerJoin("users", "users.id", "sessions.user_id")
		.where("sessions.id", "=", sessionId)
		.select([
			"sessions.id",
			"sessions.user_id",
			"sessions.expires_at",
			"users.full_name",
			"users.role",
		])
		.executeTakeFirst();

	if (!result) return { session: null, user: null };

	if (Date.now() >= result.expires_at) {
		await db.deleteFrom("sessions").where("id", "=", sessionId).execute();
		return { session: null, user: null };
	}

	return {
		session: {
			id: result.id,
			user_id: result.user_id,
			expires_at: result.expires_at,
		},
		user: { id: result.user_id, name: result.full_name, role: result.role },
	};
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.deleteFrom("sessions").where("id", "=", sessionId).execute();
}
