import {
  reviewIdentity,
  validateIdentitySubmission,
  type IdentityRecord,
} from "./identity-demo.ts";

const EVENT = "oficios-identity-changed";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("Tu navegador no permite guardar imágenes de esta demo."));
      return;
    }
    const request = indexedDB.open("oficios-media-demo", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("assets");
      db.createObjectStore("identities", { keyPath: "subjectId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("No se pudo abrir el almacenamiento local de imágenes."));
    request.onblocked = () =>
      reject(new Error("Cerrá otras pestañas de la demo e intentá de nuevo."));
  });
}
async function transaction<T>(
  stores: string[],
  mode: IDBTransactionMode,
  operation: (tx: IDBTransaction, result: (value: T) => void) => void,
): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let output: T;
      tx.oncomplete = () => resolve(output);
      tx.onerror = () =>
        reject(
          new Error(
            "No se pudieron guardar o leer las imágenes. Revisá el espacio de tu navegador.",
          ),
        );
      tx.onabort = () => reject(new Error("Se canceló la operación de imágenes."));
      try {
        operation(tx, (value) => {
          output = value;
        });
      } catch (error) {
        tx.abort();
        reject(error);
      }
    });
  } finally {
    db.close();
  }
}
export async function validateImage(file: File, maxMB = 5): Promise<void> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Elegí una imagen JPG, PNG o WEBP.");
  if (!file.size || file.size > maxMB * 1024 * 1024)
    throw new Error(`La imagen debe pesar hasta ${maxMB} MB.`);
  try {
    const image = await createImageBitmap(file);
    const valid = image.width >= 100 && image.height >= 100;
    image.close();
    if (!valid) throw new Error();
  } catch {
    throw new Error(
      "No se pudo leer la imagen. Usá una foto válida de al menos 100 × 100 píxeles.",
    );
  }
}
export async function readAsset(id: string): Promise<Blob | undefined> {
  if (!id) return undefined;
  return transaction<Blob | undefined>(["assets"], "readonly", (tx, result) => {
    const request = tx.objectStore("assets").get(id);
    request.onsuccess = () => result(request.result as Blob | undefined);
  });
}
export async function saveLogo(file: File): Promise<string> {
  await validateImage(file, 2);
  const id = `logo-${crypto.randomUUID()}`;
  await transaction<void>(["assets"], "readwrite", (tx) => {
    tx.objectStore("assets").put(file, id);
  });
  return id;
}
export async function saveRequestPhoto(file: File): Promise<string> {
  await validateImage(file, 5);
  const id = `request-photo-${crypto.randomUUID()}`;
  await transaction<void>(["assets"], "readwrite", (tx) => { tx.objectStore("assets").put(file, id); });
  return id;
}
export async function saveWorkPhoto(file: File): Promise<string> {
  await validateImage(file, 5);
  const id = `work-photo-${crypto.randomUUID()}`;
  await transaction<void>(["assets"], "readwrite", (tx) => { tx.objectStore("assets").put(file, id); });
  return id;
}
export async function removeRequestPhoto(id: string): Promise<void> {
  if (!id.startsWith("request-photo-")) throw new Error("Foto de solicitud inválida.");
  await transaction<void>(["assets"], "readwrite", (tx) => { tx.objectStore("assets").delete(id); });
}
export async function listIdentities(): Promise<IdentityRecord[]> {
  return transaction<IdentityRecord[]>(["identities"], "readonly", (tx, result) => {
    const request = tx.objectStore("identities").getAll();
    request.onsuccess = () => result(request.result as IdentityRecord[]);
  });
}
function notify() {
  window.dispatchEvent(new Event(EVENT));
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(EVENT);
    channel.postMessage("changed");
    channel.close();
  }
}
export function subscribeIdentities(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("focus", callback);
  const channel = "BroadcastChannel" in window ? new BroadcastChannel(EVENT) : null;
  if (channel) channel.onmessage = callback;
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("focus", callback);
    channel?.close();
  };
}
export async function submitIdentity(input: {
  subjectId: string;
  name: string;
  dni: string;
  front: File | null;
  back: File | null;
  selfie: File | null;
  consent: boolean;
}): Promise<void> {
  validateIdentitySubmission(input);
  await Promise.all([input.front!, input.back!, input.selfie!].map((file) => validateImage(file)));
  const id = crypto.randomUUID();
  const record: IdentityRecord = {
    subjectId: input.subjectId,
    name: input.name,
    dni: input.dni.trim(),
    frontId: `${id}-front`,
    backId: `${id}-back`,
    selfieId: `${id}-selfie`,
    status: "pending",
    reason: "",
    submittedAt: Date.now(),
    reviewedAt: null,
  };
  await transaction<void>(["assets", "identities"], "readwrite", (tx) => {
    const identities = tx.objectStore("identities");
    const previous = identities.get(input.subjectId);
    previous.onsuccess = () => {
      const old = previous.result as IdentityRecord | undefined;
      if (old)
        for (const key of [old.frontId, old.backId, old.selfieId])
          tx.objectStore("assets").delete(key);
      tx.objectStore("assets").put(input.front, record.frontId);
      tx.objectStore("assets").put(input.back, record.backId);
      tx.objectStore("assets").put(input.selfie, record.selfieId);
      identities.put(record);
    };
  });
  notify();
}
export async function setIdentityReview(subjectId: string, approved: boolean, reason: string) {
  let reviewError: unknown;
  try {
    await transaction<void>(["identities"], "readwrite", (tx) => {
      const store = tx.objectStore("identities");
      const request = store.get(subjectId);
      request.onsuccess = () => {
        try {
          const record = request.result as IdentityRecord | undefined;
          if (!record) throw new Error("No se encontró la documentación.");
          store.put(reviewIdentity(record, approved, reason));
        } catch (error) { reviewError = error; tx.abort(); }
      };
    });
  } catch (error) { throw reviewError ?? error; }
  notify();
}
export async function deleteIdentity(subjectId: string) {
  await transaction<void>(["assets", "identities"], "readwrite", (tx) => {
    const request = tx.objectStore("identities").get(subjectId);
    request.onsuccess = () => {
      const record = request.result as IdentityRecord | undefined;
      if (record)
        for (const id of [record.frontId, record.backId, record.selfieId])
          tx.objectStore("assets").delete(id);
      tx.objectStore("identities").delete(subjectId);
    };
  });
  notify();
}
