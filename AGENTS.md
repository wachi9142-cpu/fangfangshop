# AGENTS.md — Fang Fang Shop (Frontend)

> เอกสารสำหรับ AI agent ทุกตัว (รวมถึง Claude Code) และนักพัฒนาที่เพิ่งเข้ามาในโปรเจกต์
> อ่านไฟล์นี้ก่อนเริ่มแก้โค้ดเสมอ

---

## 1. โปรเจกต์นี้คืออะไร (What this project is)

**Fang Fang Shop** คือ **เว็บแอปสำหรับมือถือ (mobile-first web app)** ที่ใช้แสดง
**รายการสินค้า ราคา และจำนวนสต็อกปัจจุบัน** ของร้านค้าปลีก/ร้านของชำแห่งหนึ่ง

แนวคิดหลักของแอป:

- **สำหรับลูกค้า / ผู้ใช้ทั่วไป (ยังไม่ล็อกอิน):** เปิดเข้ามาจะเห็นแค่
  - รายการสินค้า
  - ราคาของแต่ละสินค้า
  - จำนวนสต็อกปัจจุบัน (พร้อมสถานะ: พร้อมขาย / ใกล้หมด / หมด)
  - ค้นหาและกรองตามหมวดหมู่ได้
- **สำหรับพนักงาน / เจ้าของร้าน (ล็อกอินแล้ว):** เมื่อพนักงานเติมของเข้าร้านจริง
  จะต้องมาอัปเดตจำนวนในเว็บนี้ด้วย หลังล็อกอินจะเห็นเมนูเพิ่มเติม เช่น
  - จัดการสต็อก (เพิ่ม/แก้ไข/ลดจำนวนสินค้า)
  - เพิ่มสินค้าใหม่ อัปโหลดรูป ฯลฯ

> **การล็อกอินตั้งใจให้ง่าย** — เป็นแค่ username / password ธรรมดา
> ไม่ได้ต้องการระบบ auth ที่ซับซ้อน (ไม่มี OAuth, ไม่มี JWT ซับซ้อน, ไม่ต้องมี role หลายชั้น)
> เป้าหมายคือแยกแค่ "คนทั่วไปที่ดูอย่างเดียว" ออกจาก "พนักงานที่แก้สต็อกได้"

---

## 2. สถานะปัจจุบันของโค้ด (Current state — สำคัญมาก)

⚠️ **โปรดแยกให้ออกระหว่าง "เป้าหมายของโปรเจกต์" (ข้อ 1) กับ "สิ่งที่โค้ดทำได้จริงตอนนี้"**

สิ่งที่ **มีแล้ว** ในโค้ดปัจจุบัน:

- ✅ หน้ารายการสินค้า (แสดงชื่อ / ราคา / สต็อก / รูป / หมวดหมู่)
- ✅ สถานะสต็อก: `พร้อมขาย` / `ใกล้หมด` / `หมด` (คำนวณจาก `stock` เทียบกับ `minStock`)
- ✅ ค้นหาสินค้า + ประวัติการค้นหา (search history)
- ✅ กรองตามหมวดหมู่และหมวดหมู่ย่อย (subcategory)
- ✅ สรุปภาพรวม (จำนวนสินค้า / ใกล้หมด / หมด)
- ✅ เพิ่มสินค้าใหม่ผ่าน Modal + อัปโหลดรูป (แปลงเป็น data URL)
- ✅ บันทึกข้อมูลลง **`localStorage` ของเบราว์เซอร์** (ยังไม่มีฐานข้อมูลจริง)
- ✅ **ระบบล็อกอินพนักงานแบบง่าย (client-side)** — ปุ่ม "พนักงานเข้าสู่ระบบ" บน header,
  ตรวจ username/password จากรายการ `staffAccounts` ใน `app/page.tsx`,
  จำสถานะไว้ใน `localStorage` (`fangfangshop-auth`)
  - บัญชีทดสอบ: `owner` / `1234` (เจ้าของร้าน), `staff` / `1234` (พนักงานขาย)
- ✅ **แยก UI ตามสถานะล็อกอิน** — ผู้ที่ยังไม่ล็อกอินเห็นแค่รายการสินค้า/ราคา/สต็อก
  ส่วน dashboard สรุปยอด, เครื่องมือจัดการ (รับของเข้า/ปรับสต็อก ฯลฯ),
  ปุ่มเพิ่ม/แก้ไขสินค้า และแท็บ "สต็อก" จะโผล่เฉพาะพนักงานที่ล็อกอินแล้ว (ตัวแปร `isStaff`)

สิ่งที่ **ยังไม่มี** และถือเป็นงานที่ต้องทำต่อ (roadmap):

- ❌ **auth ฝั่งเซิร์ฟเวอร์จริง** — ตอนนี้ล็อกอินตรวจสอบใน client ล้วนๆ (รหัสผ่าน hardcode)
  ยังไม่ปลอดภัยสำหรับ production เมื่อทำ backend ให้ย้ายไปตรวจที่เซิร์ฟเวอร์
- ❌ การเชื่อมต่อ **backend / API จริง** — ตอนนี้ข้อมูลทั้งหมด hardcode อยู่ใน `app/page.tsx`
  และ persist ผ่าน `localStorage` เท่านั้น (ดู repo `fangfangshop-back` ที่ยังว่างอยู่)
- ❌ หน้าจัดการสต็อกจริง — ปุ่ม "ปรับสต็อก/รับของเข้า/เช็กรอบวัน" ยังเป็น UI เปล่า ยังไม่ผูก logic
- ❌ การซิงก์ข้อมูลข้ามอุปกรณ์ (ตอนนี้ข้อมูลอยู่แค่ในเครื่อง/เบราว์เซอร์ของแต่ละคน)

> เมื่อจะทำฟีเจอร์ล็อกอินหรือเชื่อม backend ให้ยึดแนวคิดในข้อ 1 เป็นหลัก:
> **เรียบง่ายที่สุด** พอแยกสิทธิ์ดู vs แก้ได้ก็พอ

---

## 3. Tech stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 |
| Component Kit | Ant Design 5 (`antd`) + `@ant-design/icons` + `@ant-design/v5-patch-for-react-19` |
| ภาษา | TypeScript |
| การจัดเก็บข้อมูล | `localStorage` (ยังไม่มี backend) |
| Styling | `app/globals.css` + inline/AntD |

> ⚠️ **React 19 + Ant Design 5:** Next.js 15 ใช้ React 19 ส่วน antd v5 รองรับ React 16–18
> โดยตรง จึงต้องมี patch `@ant-design/v5-patch-for-react-19` (import ที่ `app/antd-compat.tsx`)
> และห่อแอปด้วย antd `<App>` ใน `app/layout.tsx` เพื่อใช้ `message`/`Modal` แบบ context ผ่าน
> `App.useApp()` (อย่าใช้ static `message.xxx` ตรงๆ — จะขึ้น warning). **อย่า downgrade กลับไป
> React 18 และอย่าลบ patch/`<App>` ออก** ไม่งั้น warning เรื่อง version จะกลับมา

---

## 4. โครงสร้างไฟล์ (Project structure)

```
fangfangshop/
├── app/
│   ├── page.tsx      ← หัวใจของแอปเกือบทั้งหมดอยู่ที่นี่ (~2,600 บรรทัด)
│   ├── layout.tsx    ← root layout + AntD registry
│   └── globals.css   ← สไตล์ทั้งหมด
├── public/
│   └── product-images/  ← รูปสินค้า (.png / .svg) จัดกลุ่มตามหมวด
├── package.json
├── next.config.mjs
├── tsconfig.json
└── README.md
```

### จุดที่ควรรู้เกี่ยวกับ `app/page.tsx`

ไฟล์นี้เป็น client component (`"use client"`) ไฟล์เดียวที่รวมทุกอย่างไว้:

- **`type Product`** — โครงสร้างข้อมูลสินค้า (id, name, category, stock, minStock, unit, shelf, price, updatedBy, imageUrl ฯลฯ)
- **ตารางข้อมูล constant** — สินค้าถูกประกาศเป็น array แยกตามหมวด เช่น
  `beverageProducts`, `alcoholProducts`, `layProducts`, `petProducts`,
  `herbalDrinkProducts`, `seasoningProducts`, `milkProducts`, `bulkPackProducts` ฯลฯ
  แล้วนำมารวมเป็น `initialProducts`
- **แผนที่ช่วยเหลือ (maps)** — `productImageByName` (ชื่อ→รูป),
  `productPriceByName`, `productStockByName`, `legacyProductNameMap` (แปลงชื่อเก่า→ใหม่)
- **หมวดหมู่** — `defaultCategories` และ subcategory maps ต่างๆ
- **`getStatus()`** — คำนวณสถานะสต็อกจาก stock/minStock
- **`export default function Home()`** — คอมโพเนนต์หลัก: state, ฟิลเตอร์, ค้นหา,
  Modal เพิ่มสินค้า, และ JSX ของทั้งหน้า

> **หมายเหตุ:** ราคา `0` ในข้อมูลหมายถึง "ยังไม่ได้ตั้งราคา" (รอเจ้าของร้านกรอก) ไม่ได้แปลว่าฟรี

---

## 5. วิธีรัน (Run locally)

```bash
npm install
npm run dev      # เปิด http://localhost:3000
```

คำสั่งอื่น:

```bash
npm run build    # build production
npm run start    # รัน production build
npm run lint     # ESLint
```

---

## 6. แนวทางสำหรับ AI agent เมื่อแก้โค้ด (Conventions)

- โปรเจกต์นี้เป็นภาษาไทยเป็นหลัก — **ข้อความ UI, ชื่อสินค้า, ชื่อหมวดหมู่ ให้เป็นภาษาไทย**
- ยึดสไตล์เดิม: ใช้ Ant Design components, TypeScript แบบ typed, ฟังก์ชันเล็กๆ ที่อ่านง่าย
- เก็บ logic ของสินค้า/หมวดหมู่ให้อยู่ในรูปแบบ constant map เหมือนของเดิม
- **mobile-first เสมอ** — ออกแบบให้ดูดีบนจอมือถือก่อน
- เวลาจะเพิ่มสินค้าใหม่แบบ hardcode ให้เพิ่มใน 3 ที่ให้ครบ: array ของหมวดนั้น,
  `productImageByName` (ถ้ามีรูป), และวางไฟล์รูปใน `public/product-images/`
- ก่อนคอมมิต: รัน `npm run lint` และ `npm run build` ให้ผ่าน
- อย่าลบข้อมูลสินค้าที่มีอยู่ทิ้งโดยไม่จำเป็น — มันคือ catalog จริงของร้าน

---

## 7. งานถัดไปที่น่าจะถูกสั่ง (Likely next tasks)

1. เพิ่มระบบล็อกอิน username/password แบบง่าย + ซ่อนเมนูจัดการสต็อกจากผู้ที่ยังไม่ล็อกอิน
2. สร้าง backend จริง (ดู repo `fangfangshop-back`) แล้วย้ายข้อมูลจาก hardcode/localStorage ไปเป็น API
3. หน้าจัดการสต็อกสำหรับพนักงาน (แก้จำนวน, แก้ราคา, ตั้งราคาให้สินค้าที่ price = 0)
