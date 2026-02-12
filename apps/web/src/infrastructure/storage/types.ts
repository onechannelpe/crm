export interface StorageFile {
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
}

export interface StorageProvider {
  save(file: File, path: string): Promise<StorageFile>;
  delete(filepath: string): Promise<void>;
  getUrl(filepath: string): string;
}
