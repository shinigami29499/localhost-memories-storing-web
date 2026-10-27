const DATABASE_NAME = "shinigacim-upload-files";
const STORE_NAME = "files";
const DATABASE_VERSION = 1;

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open upload storage."));
    request.onblocked = () => reject(new Error("Upload storage is blocked by another browser tab."));
  });
  return databasePromise;
}

export async function saveUploadFile(id: string, file: File): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(file, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the selected file."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Saving the selected file was aborted."));
  });
}

export async function getUploadFile(id: string): Promise<File | undefined> {
  const database = await openDatabase();
  return new Promise<File | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as File | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not read the selected file."));
  });
}

export async function removeUploadFile(id: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove the stored file."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Removing the stored file was aborted."));
  });
}
