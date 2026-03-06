import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

interface ReceivedEvent {
  authorization: string | null;
  body: unknown;
}

export interface SyncSink {
  baseUrl: string;
  events: ReceivedEvent[];
  close: () => Promise<void>;
}

function collectRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", reject);
  });
}

function writeJson(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

export async function createSyncSink(): Promise<SyncSink> {
  const events: ReceivedEvent[] = [];

  const server: Server = createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/extension/events") {
      writeJson(res, 404, { ok: false });
      return;
    }

    const raw = await collectRequestBody(req);
    const parsed: unknown = raw === "" ? {} : JSON.parse(raw);

    events.push({
      authorization: req.headers.authorization ?? null,
      body: parsed,
    });

    writeJson(res, 200, { ok: true });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind sync sink server");
  }

  const close = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  };

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    events,
    close,
  };
}
