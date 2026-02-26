/**
 * Generates an HMAC-SHA256 signature for a given message.
 * @param message The content to sign
 * @param secret The secret key
 */
export async function signHmac(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", key, messageData);

    // Return base64url encoded signature
    return btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}
