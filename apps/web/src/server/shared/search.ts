import { env } from "~/lib/env";
import { createHmac } from "node:crypto";

interface SearchResult {
    dni: string;
    name: string;
    phone_primary: string | null;
    phone_secondary: string | null;
    org_ruc: string | null;
    org_name: string | null;
}

interface SearchResponse {
    results: SearchResult[];
    count: number;
}

export type SearchType = "dni" | "ruc" | "phone" | "name";

function signRequest(body: string): { signature: string; timestamp: string } {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const timestampBytes = Buffer.alloc(8);
    timestampBytes.writeBigUInt64BE(BigInt(timestamp));

    const mac = createHmac("sha256", env.engineHmacSecret);
    mac.update(timestampBytes);
    mac.update(body);

    return { signature: mac.digest("hex"), timestamp };
}

export async function searchEngine(
    type: SearchType,
    value: string,
    limit: number = 20,
): Promise<SearchResponse> {
    const body = JSON.stringify({ type, value, limit });
    const { signature, timestamp } = signRequest(body);

    const response = await fetch(`${env.engineUrl}/search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Signature": signature,
            "X-Timestamp": timestamp,
        },
        body,
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Engine error ${response.status}: ${error}`);
    }

    return response.json();
}

export async function checkEngineHealth(): Promise<boolean> {
    try {
        const res = await fetch(`${env.engineUrl}/health`);
        return res.ok;
    } catch {
        return false;
    }
}
