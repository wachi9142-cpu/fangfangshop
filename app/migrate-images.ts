// ย้ายรูปเก่าที่เคยเก็บไว้ใน IndexedDB ของเครื่อง ขึ้นไปไว้บนคลังรูปกลางของ backend
//
// ก่อนหน้านี้รูปที่พนักงานอัปเองอยู่แค่ในเบราว์เซอร์เครื่องนั้น คนอื่นเปิดดูไม่เห็น
// ตอนนี้ backend มีที่เก็บกลางแล้ว จึงย้ายขึ้นให้ครั้งเดียวตอนล็อกอิน
//
// รันซ้ำได้ไม่พัง: id ของรูปคือ sha256 ของไฟล์ อัปซ้ำก็ได้ url เดิม

import { updateMe, updateProduct, uploadImageFromDataUrl, type ApiProduct } from "./api";
import { avatarStorageKey, productImagePrefix, readAllImages, writeImage } from "./local-images";

const migratedFlagKey = "fangfangshop-images-migrated";

export type MigrationResult = { products: number; avatar: boolean; failed: number };

/** ย้ายแล้วหรือยัง (เก็บต่อ user เผื่อสลับคนบนเครื่องเดียวกัน) */
function flagKeyFor(username: string) {
  return `${migratedFlagKey}:${username}`;
}

export function hasMigrated(username: string): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(flagKeyFor(username)) === "done";
}

function markMigrated(username: string) {
  window.localStorage.setItem(flagKeyFor(username), "done");
}

/**
 * อ่านรูปเก่าในเครื่อง → อัปขึ้น API → ผูกกับสินค้า/รูปประจำตัว
 *
 * `products` ใช้หา id ของสินค้าจากคีย์ `ชื่อ|ป้ายขนาด` ที่ IndexedDB เก็บไว้
 * คืนจำนวนที่ย้ายสำเร็จ เพื่อเอาไปแจ้งผู้ใช้
 */
export async function migrateLocalImages(
  username: string,
  products: Pick<ApiProduct, "id" | "name" | "sizeLabel">[]
): Promise<MigrationResult> {
  const result: MigrationResult = { products: 0, avatar: false, failed: 0 };

  if (hasMigrated(username)) return result;

  const stored = await readAllImages().catch(() => ({} as Record<string, string>));
  const entries = Object.entries(stored);

  if (entries.length === 0) {
    markMigrated(username);
    return result;
  }

  // คีย์ที่ IndexedDB ใช้คือ `ชื่อสินค้า|ป้ายขนาด` — ทำ map ไว้หา id
  const idByVariant = new Map<string, number>();
  products.forEach((product) => {
    idByVariant.set(`${product.name.trim()}|${(product.sizeLabel ?? "").trim()}`, product.id);
  });

  for (const [key, value] of entries) {
    // ค่าที่ไม่ใช่รูปที่อัปเอง (เช่น "preset:cat") ไม่ต้องย้าย
    if (!value.startsWith("data:")) continue;

    try {
      if (key === avatarStorageKey) {
        const { url } = await uploadImageFromDataUrl(value, "avatar");
        await updateMe({ avatarUrl: url });
        // เก็บ url ใหม่ทับของเดิมในเครื่อง ใช้เป็น cache ตอนออฟไลน์
        await writeImage(avatarStorageKey, url);
        result.avatar = true;
        continue;
      }

      if (!key.startsWith(productImagePrefix)) continue;

      const variantKey = key.slice(productImagePrefix.length);
      const productId = idByVariant.get(variantKey);

      if (productId === undefined) {
        // สินค้าตัวนั้นไม่มีใน catalog แล้ว ข้ามไป
        continue;
      }

      const { url } = await uploadImageFromDataUrl(value, "product");
      await updateProduct(productId, { imageUrl: url });
      await writeImage(key, url);
      result.products += 1;
    } catch {
      result.failed += 1;
    }
  }

  // ถ้ามีตัวที่พลาด ยังไม่ปักธง จะได้ลองใหม่รอบหน้า
  if (result.failed === 0) {
    markMigrated(username);
  }

  return result;
}
