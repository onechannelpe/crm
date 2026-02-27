import { existsSync, rmSync, cpSync, mkdirSync } from "node:fs";

export function ensureDirectory(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function ensureCleanDirectory(path: string): void {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
  mkdirSync(path, { recursive: true });
}

export function copyDirectory(source: string, destination: string): void {
  ensureDirectory(destination);
  cpSync(source, destination, { recursive: true });
}
