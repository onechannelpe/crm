const MAX_PASSWORD_LENGTH = 1000;
const ARGON2_MEMORY_COST_KIB = 19 * 1024;
const ARGON2_TIME_COST = 2;

function ensureValidPasswordInput(password: string): void {
  if (password.length === 0) throw new Error("Password cannot be empty");
  if (password.length > MAX_PASSWORD_LENGTH)
    throw new Error("Password too long");
}

export async function hashPassword(password: string): Promise<string> {
  ensureValidPasswordInput(password);
  return Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: ARGON2_MEMORY_COST_KIB,
    timeCost: ARGON2_TIME_COST,
  });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH)
    return false;
  try {
    return await Bun.password.verify(password, hash);
  } catch {
    return false;
  }
}
