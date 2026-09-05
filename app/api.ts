// ตัวเชื่อม API ไป backend (fangfangshop-back) — เก็บ logic การเรียก server ไว้ที่เดียว
// สัญญาของข้อมูลยึดตาม ../../fangfangshop-back/NOTES-รูปภาพ-ถึงฝั่งหน้าเว็บ.md
// เปลี่ยน URL ได้ผ่าน env NEXT_PUBLIC_API_BASE (ดู .env.local)

export type ApiProduct = {
  id: number;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  price: number;
  updatedBy: string;
  sizeLabel?: string;
  imageUrl?: string;
  isPlaceholder?: boolean;
};

/** คนในบ้านที่ล็อกอินได้ — ใช้ทำหน้าจอเลือกคนตอนเข้าสู่ระบบ */
export type ApiUser = {
  username: string;
  displayName: string;
  avatarUrl?: string;
};

export type UploadedImage = {
  id: string;
  url: string;
  mime: string;
  byteSize: number;
};

// dev ในเครื่องใช้พอร์ต 4001 (ตรงกับ default ของ backend)
// production ยิงผ่าน /api ของ nginx — ตั้งค่าใน .env.local ทับได้
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "http://localhost:4001";

const tokenStorageKey = "fangfangshop-token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(tokenStorageKey);
}

export function setToken(token: string) {
  window.localStorage.setItem(tokenStorageKey, token);
}

export function clearToken() {
  window.localStorage.removeItem(tokenStorageKey);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

/**
 * รูปที่ API คืนมาเป็น path (`/images/<sha256>.png`) ไม่ใช่ URL เต็ม — ต้องต่อ API_BASE เอง
 * ส่วนรูป default ใน public/product-images/... กับ data URL ใช้ค่าเดิมตามปกติ
 */
export function resolveImageUrl(url: string): string;
export function resolveImageUrl(url: string | null | undefined): string | undefined;
export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("/images/") ? `${API_BASE}${url}` : url;
}

// ---- ดึงรายการสินค้าทั้งหมด (ทุกคนเรียกได้) ----
export async function fetchProducts(): Promise<ApiProduct[]> {
  const res = await fetch(`${API_BASE}/products`, { cache: "no-store" });
  if (!res.ok) throw new Error(`โหลดสินค้าไม่สำเร็จ (${res.status})`);
  return (await res.json()) as ApiProduct[];
}

// ---- รายชื่อคนในบ้าน (ไม่ต้องล็อกอิน) ----
export async function fetchUsers(): Promise<ApiUser[]> {
  const res = await fetch(`${API_BASE}/users`, { cache: "no-store" });
  if (!res.ok) throw new Error(`โหลดรายชื่อไม่สำเร็จ (${res.status})`);
  return (await res.json()) as ApiUser[];
}

// ---- ล็อกอินพนักงาน — backend คืนมาแบบแบน { token, username, displayName, avatarUrl? } ----
export async function login(
  username: string,
  password: string
): Promise<{ token: string } & ApiUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error(await errorMessage(res, "เข้าสู่ระบบไม่สำเร็จ"));
  return (await res.json()) as { token: string } & ApiUser;
}

/** เช็คว่า token ที่เก็บไว้ยังใช้ได้ไหม + ได้ชื่อ/รูปล่าสุด (คืน null ถ้าใช้ไม่ได้แล้ว) */
export async function fetchMe(): Promise<ApiUser | null> {
  if (!getToken()) return null;

  const res = await fetch(`${API_BASE}/auth/me`, {
    cache: "no-store",
    headers: authHeaders()
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ (${res.status})`);
  return (await res.json()) as ApiUser;
}

/** แก้ชื่อที่แสดง / รูปประจำตัวของตัวเอง — ส่ง avatarUrl: null เพื่อเอารูปออก */
export async function updateMe(patch: {
  displayName?: string;
  avatarUrl?: string | null;
}): Promise<ApiUser> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error(await errorMessage(res, "บันทึกโปรไฟล์ไม่สำเร็จ"));
  return (await res.json()) as ApiUser;
}

/** เปลี่ยนรหัสผ่านตัวเอง — เปลี่ยนแล้ว token เดิมใช้ไม่ได้ ต้องล็อกอินใหม่ */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  if (!res.ok) throw new Error(await errorMessage(res, "เปลี่ยนรหัสผ่านไม่สำเร็จ"));
}

// ---- ออกจากระบบ (ลบ session ฝั่ง server ด้วย) ----
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", headers: authHeaders() });
  } catch {
    // ไม่เป็นไรถ้าเรียกไม่ได้ — เคลียร์ token ฝั่ง client อยู่ดี
  }
  clearToken();
}

// ---- อัปโหลดรูปเข้าคลังกลาง (ต้องล็อกอิน) ----
// id ของรูปคือ sha256 ของไฟล์ → อัปรูปเดิมซ้ำได้ url เดิม ไม่กินที่เพิ่ม
export async function uploadImage(
  file: File | Blob,
  kind: "product" | "avatar" = "product"
): Promise<UploadedImage> {
  const form = new FormData();
  form.append("file", file);

  // อย่าตั้ง Content-Type เอง — ต้องให้เบราว์เซอร์ใส่ boundary ให้
  const res = await fetch(`${API_BASE}/images?kind=${kind}`, {
    method: "POST",
    headers: authHeaders(),
    body: form
  });
  if (!res.ok) throw new Error(await errorMessage(res, "อัปโหลดรูปไม่สำเร็จ"));
  return (await res.json()) as UploadedImage;
}

/** อัปโหลดรูปจาก data URL (ใช้ตอนย้ายรูปเก่าที่เก็บไว้ในเครื่อง) */
export async function uploadImageFromDataUrl(
  dataUrl: string,
  kind: "product" | "avatar" = "product"
): Promise<UploadedImage> {
  const res = await fetch(`${API_BASE}/images?kind=${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ dataUrl })
  });
  if (!res.ok) throw new Error(await errorMessage(res, "อัปโหลดรูปไม่สำเร็จ"));
  return (await res.json()) as UploadedImage;
}

// ---- เพิ่มสินค้า (ต้องล็อกอิน) ----
export async function createProduct(data: Partial<ApiProduct>): Promise<ApiProduct> {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(await errorMessage(res, "เพิ่มสินค้าไม่สำเร็จ"));
  return (await res.json()) as ApiProduct;
}

// ---- แก้ไขสินค้า/สต็อก/ราคา/รูป (ต้องล็อกอิน) ----
// imageUrl: null = ลบรูปที่ตั้งเอง กลับไปใช้รูปเริ่มต้นในโค้ด
export async function updateProduct(
  id: number,
  patch: Partial<Omit<ApiProduct, "imageUrl">> & { imageUrl?: string | null }
): Promise<ApiProduct> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error(await errorMessage(res, "แก้ไขสินค้าไม่สำเร็จ"));
  return (await res.json()) as ApiProduct;
}
