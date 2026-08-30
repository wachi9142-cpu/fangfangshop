// เก็บรูปที่ผู้ใช้เลือกเอง (รูปสินค้า + รูปประจำตัว) ไว้ใน "เครื่องของผู้ใช้" ด้วย IndexedDB
//
// ทำไมไม่เก็บบนเซิร์ฟเวอร์: backend (fangfangshop-back) ยังไม่มีที่เก็บรูป และมีคนอื่นดูแลอยู่
// รายละเอียดว่าต้องเพิ่มอะไรฝั่งเซิร์ฟเวอร์ ดู ../../NOTES-ระบบรูปภาพ.md
//
// ⚠️ ข้อจำกัดสำคัญ: รูปอยู่แค่ในเบราว์เซอร์เครื่องนั้น — คนอื่นเปิดดูจะไม่เห็นรูปที่เราใส่
// ใช้ IndexedDB แทน localStorage เพราะ localStorage จำกัดแค่ ~5 MB ใส่รูปได้ไม่กี่ใบ

const dbName = "fangfangshop-images";
const storeName = "images";

/** คีย์ของรูปประจำตัวพนักงาน */
export const avatarStorageKey = "staff-avatar";

/** คำนำหน้าคีย์ของรูปสินค้า (ตามด้วย `ชื่อสินค้า|ป้ายขนาด`) */
export const productImagePrefix = "product:";

let dbPromise: Promise<IDBDatabase | null> | null = null;

// สำรองไว้กรณีเบราว์เซอร์ไม่ให้ใช้ IndexedDB (เช่นโหมดไม่ระบุตัวตน)
// อย่างน้อยยังใช้งานได้จนกว่าจะปิดแท็บ
const memoryStore = new Map<string, string>();

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }

    try {
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) {
          request.result.createObjectStore(storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

/** อ่านรูปทั้งหมดที่เก็บไว้ — คืนเป็น { คีย์: data URL } */
export async function readAllImages(): Promise<Record<string, string>> {
  const db = await openDb();

  if (!db) return Object.fromEntries(memoryStore);

  return new Promise((resolve) => {
    try {
      const store = db.transaction(storeName, "readonly").objectStore(storeName);
      const keysRequest = store.getAllKeys();
      const valuesRequest = store.getAll();

      valuesRequest.onsuccess = () => {
        const keys = keysRequest.result as IDBValidKey[];
        const values = valuesRequest.result as string[];
        const result: Record<string, string> = {};

        keys.forEach((key, index) => {
          const value = values[index];

          if (typeof value === "string") {
            result[String(key)] = value;
          }
        });

        resolve(result);
      };
      valuesRequest.onerror = () => resolve({});
    } catch {
      resolve({});
    }
  });
}

/** บันทึกรูป (หรือค่าอย่าง "preset:cat") ลงเครื่อง */
export async function writeImage(key: string, value: string): Promise<void> {
  memoryStore.set(key, value);

  const db = await openDb();

  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(storeName, "readwrite");

      transaction.objectStore(storeName).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** ลบรูปที่เก็บไว้ กลับไปใช้รูปเดิมจากแคตตาล็อก */
export async function removeImage(key: string): Promise<void> {
  memoryStore.delete(key);

  const db = await openDb();

  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(storeName, "readwrite");

      transaction.objectStore(storeName).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}
