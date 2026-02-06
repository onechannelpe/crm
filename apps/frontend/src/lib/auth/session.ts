import { sha256 } from "@oslojs/crypto/sha2";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { db } from "../db/client";

export interface Session {
  id: string;
  userId: number;
  expiresAt: Date;
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export function createSession(token: string, userId: number): Session {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  };

  db.run("INSERT INTO session (id, user_id, expires_at) VALUES (?, ?, ?)", [
    session.id,
    session.userId,
    Math.floor(session.expiresAt.getTime() / 1000),
  ]);

  return session;
}

export function validateSessionToken(token: string) {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const row = db
    .query(`
    SELECT s.id, s.user_id, s.expires_at, u.id as uid, u.role, u.name 
    FROM session s
    INNER JOIN user u ON u.id = s.user_id 
    WHERE s.id = ?
  `)
    .get(sessionId) as any;

  if (!row) return { session: null, user: null };

  const session: Session = {
    id: row.id,
    userId: row.user_id,
    expiresAt: new Date(row.expires_at * 1000),
  };

  if (Date.now() >= session.expiresAt.getTime()) {
    db.run("DELETE FROM session WHERE id = ?", [session.id]);
    return { session: null, user: null };
  }

  // Extend session if halfway to expiration
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    db.run("UPDATE session SET expires_at = ? WHERE id = ?", [
      Math.floor(session.expiresAt.getTime() / 1000),
      session.id,
    ]);
  }

  return { session, user: { id: row.uid, role: row.role, name: row.name } };
}

export function invalidateSession(sessionId: string): void {
  db.run("DELETE FROM session WHERE id = ?", [sessionId]);
}
