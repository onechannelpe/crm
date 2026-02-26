function importKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        usage,
    );
}

export async function signHmac(message: string, secret: string): Promise<string> {
    const key = await importKey(secret, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
    // base64url encoded — no padding
    return btoa(String.fromCharCode(...new Uint8Array(sig)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

/**
 * Constant-time HMAC-SHA256 verification. Prevents timing-oracle attacks.
 */
export async function verifyHmac(
    message: string,
    signature: string,
    secret: string,
): Promise<boolean> {
    try {
        const key = await importKey(secret, ["verify"]);
        // Decode base64url back to raw bytes for crypto.subtle.verify
        const b64 = signature.replace(/-/g, "+").replace(/_/g, "/");
        const sigBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        return await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(message));
    } catch {
        // atob throws on invalid base64; treat as verification failure
        return false;
    }
}
