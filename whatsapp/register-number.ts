// Helper para gestionar el número de WhatsApp de un usuario del CRM en la tabla
// `user_channel_addresses` (canal whatsapp, verificado). El notifier lee de ahí.
//
// Uso:
//   bun register-number.ts --list                 Lista ejecutivos y su WhatsApp
//   bun register-number.ts <userId> <telefono>    Registra/actualiza y verifica
//
// Ejemplo:
//   bun register-number.ts 3 987654321

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createLibsql } from "./lib/libsql.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(join(__dirname, ".env"));
} catch {
  /* sin .env */
}

const db = createLibsql({
  url: process.env.WEB_DB_URL ?? "http://127.0.0.1:8080",
  authToken: process.env.WEB_DB_AUTH_TOKEN || undefined,
});
const targetRole = process.env.TARGET_ROLE ?? "executive";
const countryCode = (process.env.COUNTRY_CODE ?? "51").replace(/\D/g, "");

// Normaliza a forma local (sin código de país), como usa el CRM en sus seeds.
function normalizeLocal(raw: string): string {
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith(countryCode) && digits.length > 9) {
    digits = digits.slice(countryCode.length);
  }
  return digits;
}

interface UserRow extends Record<string, string | number | null> {
  id: number;
  username: string;
  role: string;
  address: string | null;
  is_verified: number | null;
}

async function list(): Promise<void> {
  const rows = await db.query<UserRow>(
    `SELECT u.id          AS id,
            u.username     AS username,
            u.role         AS role,
            a.address      AS address,
            a.is_verified  AS is_verified
       FROM users u
       LEFT JOIN user_channel_addresses a
         ON a.user_id = u.id AND a.channel = 'whatsapp'
      WHERE u.role = ?
      ORDER BY u.id ASC`,
    [targetRole],
  );
  console.log(`\nUsuarios con rol "${targetRole}":\n`);
  for (const r of rows) {
    const wa = r.address
      ? `${r.address}${r.is_verified ? " (verificado)" : " (SIN verificar)"}`
      : "— sin WhatsApp —";
    console.log(`  #${String(r.id).padEnd(4)} ${String(r.username).padEnd(24)} ${wa}`);
  }
  console.log("");
}

async function register(userId: number, phone: string): Promise<void> {
  const address = normalizeLocal(phone);
  if (!address || address.length < 6) {
    console.error(`Teléfono inválido: "${phone}"`);
    process.exit(1);
  }

  const users = await db.query<{ id: number; username: string; role: string }>(
    "SELECT id, username, role FROM users WHERE id = ?",
    [userId],
  );
  if (users.length === 0) {
    console.error(`No existe el usuario #${userId}.`);
    process.exit(1);
  }
  const user = users[0];

  const now = Date.now();
  await db.query(
    `INSERT INTO user_channel_addresses
        (user_id, channel, address, is_verified, verified_at, created_at, updated_at)
     VALUES (?, 'whatsapp', ?, 1, ?, ?, ?)
     ON CONFLICT(user_id, channel) DO UPDATE SET
        address     = excluded.address,
        is_verified = 1,
        verified_at = excluded.verified_at,
        updated_at  = excluded.updated_at`,
    [userId, address, now, now, now],
  );

  console.log(
    `OK: usuario #${user.id} (${user.username}, rol ${user.role}) → WhatsApp ${address} [verificado]`,
  );
}

const args = process.argv.slice(2);
if (args[0] === "--list" || args[0] === "-l") {
  await list();
} else if (args.length === 2) {
  const userId = Number(args[0]);
  if (!Number.isInteger(userId) || userId <= 0) {
    console.error(`userId inválido: "${args[0]}"`);
    process.exit(1);
  }
  await register(userId, args[1]);
} else {
  console.log(
    [
      "Uso:",
      "  bun register-number.ts --list                 Lista usuarios y su WhatsApp",
      "  bun register-number.ts <userId> <telefono>    Registra/verifica un número",
      "",
      "Ejemplo:",
      "  bun register-number.ts 3 987654321",
    ].join("\n"),
  );
  process.exit(1);
}
