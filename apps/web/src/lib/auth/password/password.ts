type Argon2HashOptions = {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
  outputLen: number;
};

type Argon2Module = {
  hash(password: string, options: Argon2HashOptions): Promise<string> | string;
  verify(passwordHash: string, password: string): Promise<boolean> | boolean;
};

let argon2ModulePromise: Promise<Argon2Module> | null = null;

function getArgon2Module(): Promise<Argon2Module> {
  if (!argon2ModulePromise) {
    argon2ModulePromise = import(
      /* @vite-ignore */
      "@node-rs/argon2"
    ) as Promise<Argon2Module>;
  }
  return argon2ModulePromise;
}

/**
 * Hashes password using Argon2id algorithm.
 * @param password - Plain text password
 * @returns Argon2id hash string
 */
export async function hashPassword(password: string): Promise<string> {
  const argon2 = await getArgon2Module();
  return argon2.hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
}

/**
 * Verifies password against Argon2id hash.
 * @param passwordHash - Argon2id hash from database
 * @param password - Plain text password to verify
 * @returns true if password matches hash
 */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    const argon2 = await getArgon2Module();
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}
