import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";

export interface FileStorage {
  putFromWebStream(input: {
    key: string;
    stream: ReadableStream<Uint8Array>;
    onChunk?: (chunk: Uint8Array) => void | Promise<void>;
  }): Promise<{ sha256: string; sizeBytes: number }>;
  putBytes(
    key: string,
    content: Uint8Array,
  ): Promise<{ sha256: string; sizeBytes: number }>;
  getBytes(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

export function streamFromBytes(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function writeToFile(root: string, key: string, content: Uint8Array) {
  const finalPath = join(root, key);
  await mkdir(dirname(finalPath), { recursive: true });
  await writeFile(finalPath, content);
}

const WORKFLOW_FILES_DIR = "workflow-files";

function toUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new Error("Unsupported stream chunk type");
}

export function openStoredFileStream(
  baseDir: string,
  key: string,
): ReadableStream<Uint8Array> {
  const nodeStream = createReadStream(join(baseDir, WORKFLOW_FILES_DIR, key));
  const webStream = Readable.toWeb(nodeStream);
  const reader = webStream.getReader();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(toUint8Array(value));
    },
    async cancel(reason) {
      await reader.cancel(reason);
    },
  });
}

export function createFileStorage(baseDir: string): FileStorage {
  const root = join(baseDir, WORKFLOW_FILES_DIR);

  return {
    async putFromWebStream({ key, stream, onChunk }) {
      await mkdir(root, { recursive: true });
      const finalPath = join(root, key);
      await mkdir(dirname(finalPath), { recursive: true });

      const tempPath = `${finalPath}.upload-${randomUUID()}`;
      const writer = createWriteStream(tempPath, { flags: "wx" });
      const hasher = createHash("sha256");
      let sizeBytes = 0;
      let failed = false;

      async function writeChunk(chunk: Uint8Array): Promise<void> {
        if (failed) throw new Error("write_session_closed");
        await onChunk?.(chunk);
        sizeBytes += chunk.byteLength;
        hasher.update(chunk);
        if (!writer.write(chunk)) {
          await once(writer, "drain");
        }
      }

      writer.on("error", () => {
        failed = true;
      });

      try {
        await stream.pipeTo(
          new WritableStream({
            write: (chunk) => writeChunk(chunk),
          }),
        );
        writer.end();
        await once(writer, "finish");
        await rename(tempPath, finalPath);
      } catch (error) {
        writer.destroy();
        await rm(tempPath, { force: true });
        throw error;
      }

      return { sha256: hasher.digest("hex"), sizeBytes };
    },

    async putBytes(key, content) {
      await mkdir(root, { recursive: true });
      await writeToFile(root, key, content);
      return {
        sha256: hashBytes(content),
        sizeBytes: content.byteLength,
      };
    },

    async getBytes(key) {
      return readFile(join(root, key));
    },

    async delete(key) {
      await rm(join(root, key), { force: true });
    },
  };
}
