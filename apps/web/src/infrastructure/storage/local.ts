import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { StorageFile, StorageProvider } from "./types";

export class LocalStorage implements StorageProvider {
  constructor(private baseDir: string = "./uploads") {}

  async save(file: File, path: string): Promise<StorageFile> {
    const dir = join(this.baseDir, path);
    await mkdir(dir, { recursive: true });

    const filepath = join(dir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    return {
      filename: file.name,
      filepath,
      mimetype: file.type,
      size: file.size,
    };
  }

  async delete(filepath: string): Promise<void> {
    await unlink(filepath);
  }

  getUrl(filepath: string): string {
    return `/uploads/${filepath}`;
  }
}

export const localStorage = new LocalStorage();
