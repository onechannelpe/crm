const DB_NAME = "crm_extension_journal_v1" as const;
const DB_VERSION = 1;
const PAYLOAD_STORE = "payloads" as const;

interface PayloadRecord {
  jobId: string;
  payload: Record<string, unknown>;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function withRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("indexeddb request failed"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PAYLOAD_STORE)) {
        database.createObjectStore(PAYLOAD_STORE, { keyPath: "jobId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("failed to open indexeddb"));
  });

  return databasePromise;
}

export async function saveLargePayload(
  jobId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(PAYLOAD_STORE, "readwrite");
  const store = transaction.objectStore(PAYLOAD_STORE);
  const record: PayloadRecord = { jobId, payload };
  await withRequest(store.put(record));
}

export async function readLargePayload(
  jobId: string,
): Promise<Record<string, unknown> | null> {
  const database = await openDatabase();
  const transaction = database.transaction(PAYLOAD_STORE, "readonly");
  const store = transaction.objectStore(PAYLOAD_STORE);
  const result = await withRequest(store.get(jobId));
  if (!result || typeof result !== "object") return null;
  const payload = (result as Partial<PayloadRecord>).payload;
  if (!payload || typeof payload !== "object") return null;
  return payload as Record<string, unknown>;
}

export async function deleteLargePayload(jobId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(PAYLOAD_STORE, "readwrite");
  const store = transaction.objectStore(PAYLOAD_STORE);
  await withRequest(store.delete(jobId));
}
