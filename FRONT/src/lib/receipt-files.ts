// Receipt and invoice files for the demo, kept in the browser's IndexedDB (localStorage is too small for images and PDFs).
// Only the metadata (ReceiptFile) lives on the expense record. In production the files go to object storage and the
// record keeps a reference; this module is the stand-in for that upload and download.

const DB = 'krew-tracker-receipts'
const STORE = 'files'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => {
      db.close()
      resolve(req.result)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

const key = (ws: string, receiptId: string) => `${ws}:${receiptId}`

export function saveReceiptFile(ws: string, receiptId: string, file: Blob): Promise<IDBValidKey> {
  return run('readwrite', (s) => s.put(file, key(ws, receiptId)))
}

export function loadReceiptFile(ws: string, receiptId: string): Promise<Blob | undefined> {
  return run('readonly', (s) => s.get(key(ws, receiptId)) as IDBRequest<Blob | undefined>)
}

export function deleteReceiptFile(ws: string, receiptId: string): Promise<undefined> {
  return run('readwrite', (s) => s.delete(key(ws, receiptId)))
}

/** Removes the stored files of one workspace, or of all of them. Used by the demo reset. */
export async function clearReceiptFiles(ws?: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  try {
    if (!ws) {
      await run('readwrite', (s) => s.clear())
      return
    }
    await run('readwrite', (s) => s.delete(IDBKeyRange.bound(`${ws}:`, `${ws}:￿`)))
  } catch {
    // Storage can be unavailable (private windows); the demo works without saved files.
  }
}
