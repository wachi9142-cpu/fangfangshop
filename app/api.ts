// ตัวเชื่อม API ไป backend (fangfangshop-back) — เก็บ logic การเรียก server ไว้ที่เดียว
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

// ---- ดึงรายการสินค้าทั้งหมด (ทุกคนเรียกได้) ----
export async function fetchProducts(): Promise<ApiProduct[]> {
  const res = await fetch(`${API_BASE}/products`, { cache: "no-store" });
  if (!res.ok) throw new Error(`โหลดสินค้าไม่สำเร็จ (${res.status})`);
  return (await res.json()) as ApiProduct[];
}

// ---- ล็อกอินพนักงาน ----
export async function login(
  username: string,
  password: string
): Promise<{ token: string; username: string; displayName: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "เข้าสู่ระบบไม่สำเร็จ");
  }
  return (await res.json()) as { token: string; username: string; displayName: string };
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

// ---- เพิ่มสินค้า (ต้องล็อกอิน) ----
export async function createProduct(data: Partial<ApiProduct>): Promise<ApiProduct> {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? "เพิ่มสินค้าไม่สำเร็จ");
  }
  return (await res.json()) as ApiProduct;
}

// ---- แก้ไขสินค้า/สต็อก/ราคา (ต้องล็อกอิน) ----
export async function updateProduct(id: number, patch: Partial<ApiProduct>): Promise<ApiProduct> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch)
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? "แก้ไขสินค้าไม่สำเร็จ");
  }
  return (await res.json()) as ApiProduct;
}
