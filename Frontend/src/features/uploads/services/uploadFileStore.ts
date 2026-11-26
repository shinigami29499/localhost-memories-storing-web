import type { AlbumTransfer } from "../uploadProgress";

const DATABASE_NAME = "shinigacim-upload-history";
const STORE_NAME = "transfers";

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "id" }).createIndex("userId", "userId");
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = undefined;
      };
      resolve(database);
    };
    request.onerror = () => reject(request.error);
  }).catch((error: unknown) => {
    databasePromise = undefined;
    throw error;
  });
  return databasePromise;
}

export async function readUploadHistory(userId: string): Promise<AlbumTransfer[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).index("userId").getAll(userId);
    request.onsuccess = () => resolve(request.result as AlbumTransfer[]);
    request.onerror = () => reject(request.error);
  });
}

async function changeHistory(change: (store: IDBObjectStore) => void): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    change(transaction.objectStore(STORE_NAME));
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function saveUploadRecord(transfer: AlbumTransfer): Promise<void> {
  await changeHistory((store) => store.put(transfer));
}

export async function removeUploadRecord(id: string): Promise<void> {
  await changeHistory((store) => store.delete(id));
}
