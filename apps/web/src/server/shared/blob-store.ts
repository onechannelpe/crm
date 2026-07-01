import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// One local-disk blob store, shared by every domain that needs to persist
// bytes under a key (workflow file artifacts, profile pictures, ...).
// Domain-specific naming/subdirectories are the caller's concern — pass a
// fully-resolved rootDir in.
export interface BlobStore {
  putBytes(
    key: string,
    content: Uint8Array,
  ): Promise<{ sha256: string; sizeBytes: number }>;
  putFromWebStream(input: {
    key: string;
    stream: ReadableStream<Uint8Array>;
    onChunk?: (chunk: Uint8Array) => void | Promise<void>;
  }): Promise<{ sha256: string; sizeBytes: number }>;
  getBytes(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createBlobStore(rootDir: string): BlobStore {
  return {
    async putFromWebStream({ key, stream, onChunk }) {
      const finalPath = join(rootDir, key);
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
      const finalPath = join(rootDir, key);
      await mkdir(dirname(finalPath), { recursive: true });
      await writeFile(finalPath, content);
      return { sha256: hashBytes(content), sizeBytes: content.byteLength };
    },

    async getBytes(key) {
      return readFile(join(rootDir, key));
    },

    async delete(key) {
      await rm(join(rootDir, key), { force: true });
    },
  };
}
