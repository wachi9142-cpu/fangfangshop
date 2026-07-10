"use client";

// ทำให้ Ant Design v5 ทำงานเข้ากันได้กับ React 19 (Next.js 15 ใช้ React 19)
// patch นี้ตั้งค่า render ของ antd ให้ใช้ createRoot ของ React 19
// ช่วยตัด warning "[antd: compatible] antd v5 support React is 16 ~ 18"
// และทำให้ Modal / message / notification แบบ static ทำงานถูกต้อง
import "@ant-design/v5-patch-for-react-19";

export default function AntdCompat({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
