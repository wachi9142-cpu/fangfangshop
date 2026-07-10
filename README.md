# Fang Fang Shop 🛒

เว็บแอปสำหรับมือถือ (mobile-first) ที่แสดง **รายการสินค้า ราคา และจำนวนสต็อก**
ของร้านของชำ "Fang Fang Shop"

- **ผู้ใช้ทั่วไป** เปิดมาเห็นรายการสินค้า ราคา และสต็อกปัจจุบัน ค้นหา/กรองหมวดหมู่ได้
- **พนักงาน/เจ้าของร้าน** ล็อกอิน (username/password แบบง่าย) เพื่อจัดการสต็อกเมื่อเติมของเข้าร้าน

> 📖 รายละเอียดโปรเจกต์ สถานะปัจจุบัน และแนวทางพัฒนาแบบเต็ม อยู่ใน **[AGENTS.md](./AGENTS.md)**
> (เอกสารสำหรับทั้งนักพัฒนาและ AI agent เช่น Claude Code)

## Tech stack

Next.js 15 (App Router) · React 18 · TypeScript · Ant Design 5 · `localStorage`

## Run locally

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000` เพื่อดูแอป

## สถานะปัจจุบัน (สั้นๆ)

- ✅ รายการสินค้า / ราคา / สถานะสต็อก / ค้นหา / กรองหมวดหมู่ / เพิ่มสินค้า
- ✅ ข้อมูลเก็บใน `localStorage` (ข้อมูลสินค้า hardcode อยู่ใน `app/page.tsx`)
- ❌ ระบบล็อกอิน และ backend จริง — ยังไม่ทำ (ดู roadmap ใน [AGENTS.md](./AGENTS.md))
