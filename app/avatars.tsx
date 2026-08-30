// รูปประจำตัวสำเร็จรูปสำหรับพนักงาน — วาดเป็น inline SVG โทนครีม/คาราเมลให้เข้ากับธีมร้าน
// เก็บในฐานข้อมูลเป็นข้อความสั้น ๆ เช่น "preset:cat" (ส่วนรูปที่อัปเองจะเก็บเป็น /uploads/xxx.jpg)
import type { ReactNode } from "react";

const outline = "#6f4a2b";

/** คำนำหน้าของรูปสำเร็จรูป ใช้แยกจากรูปที่พนักงานอัปโหลดเอง */
export const presetPrefix = "preset:";

function Frame({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

function Cat({ size = 32 }: { size?: number }) {
  const fur = "#fdf4e4";

  return (
    <Frame size={size}>
      <g stroke={outline} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
        <path d="M13 20 L15 9 L25 16 Z" fill={fur} />
        <path d="M35 20 L33 9 L23 16 Z" fill={fur} />
        <path
          d="M24 15 C32 15 38 20.5 38 27.5 C38 34.5 31.5 39.5 24 39.5 C16.5 39.5 10 34.5 10 27.5 C10 20.5 16 15 24 15 Z"
          fill={fur}
        />
      </g>
      <g fill={outline}>
        <circle cx="19.5" cy="27" r="1.9" />
        <circle cx="28.5" cy="27" r="1.9" />
      </g>
      <path
        d="M24 32.4 l-2.4 -2.2 h4.8 Z"
        fill="#d98c8c"
        stroke={outline}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </Frame>
  );
}

function Dog({ size = 32 }: { size?: number }) {
  const fur = "#e8c9a0";

  return (
    <Frame size={size}>
      <g stroke={outline} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
        <path d="M13 15 C8.5 19 8.5 30 13.5 33 L18 24 Z" fill={fur} />
        <path d="M35 15 C39.5 19 39.5 30 34.5 33 L30 24 Z" fill={fur} />
        <path
          d="M24 13.5 C31.5 13.5 36.5 19 36.5 26.5 C36.5 34 31 39.5 24 39.5 C17 39.5 11.5 34 11.5 26.5 C11.5 19 16.5 13.5 24 13.5 Z"
          fill={fur}
        />
      </g>
      <g fill={outline}>
        <circle cx="19.5" cy="25.5" r="1.9" />
        <circle cx="28.5" cy="25.5" r="1.9" />
      </g>
      <ellipse cx="24" cy="32" rx="3.1" ry="2.3" fill={outline} />
    </Frame>
  );
}

function Star({ size = 32 }: { size?: number }) {
  return (
    <Frame size={size}>
      <path
        d="M24 6.5 L29.6 18.4 L42.5 20.1 L33 29.1 L35.4 42 L24 35.9 L12.6 42 L15 29.1 L5.5 20.1 L18.4 18.4 Z"
        fill="#f0c96b"
        stroke={outline}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
    </Frame>
  );
}

function Heart({ size = 32 }: { size?: number }) {
  return (
    <Frame size={size}>
      <path
        d="M24 40 C9.5 30.5 6.5 22.5 11.3 16.8 C15.4 11.9 21.6 13.4 24 18.6 C26.4 13.4 32.6 11.9 36.7 16.8 C41.5 22.5 38.5 30.5 24 40 Z"
        fill="#e39a9a"
        stroke={outline}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
    </Frame>
  );
}

function Flower({ size = 32 }: { size?: number }) {
  const petal = "#eec3cf";

  return (
    <Frame size={size}>
      <g fill={petal} stroke={outline} strokeWidth={2.2}>
        <circle cx="24" cy="13.5" r="6.6" />
        <circle cx="34.8" cy="21.3" r="6.6" />
        <circle cx="30.7" cy="34" r="6.6" />
        <circle cx="17.3" cy="34" r="6.6" />
        <circle cx="13.2" cy="21.3" r="6.6" />
      </g>
      <circle cx="24" cy="24.5" r="6" fill="#f0c96b" stroke={outline} strokeWidth={2.2} />
    </Frame>
  );
}

function Apple({ size = 32 }: { size?: number }) {
  return (
    <Frame size={size}>
      <path
        d="M24 16 C20 12 13.5 13 11.5 19.5 C9.5 26 14 38 20 39 C22 39.4 23 38.6 24 38.6 C25 38.6 26 39.4 28 39 C34 38 38.5 26 36.5 19.5 C34.5 13 28 12 24 16 Z"
        fill="#d98c8c"
        stroke={outline}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <path d="M24 15.5 L24 9.5" stroke={outline} strokeWidth={2.4} strokeLinecap="round" />
      <path
        d="M25 11.5 C27.5 7.5 32.5 8 33 10 C33.5 12.5 28.5 14 25 11.5 Z"
        fill="#9bb08a"
        stroke={outline}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Frame>
  );
}

function Rabbit({ size = 32 }: { size?: number }) {
  const fur = "#fdf4e4";

  return (
    <Frame size={size}>
      <g stroke={outline} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
        <ellipse cx="18" cy="14" rx="4.2" ry="9.5" fill={fur} transform="rotate(-12 18 14)" />
        <ellipse cx="30" cy="14" rx="4.2" ry="9.5" fill={fur} transform="rotate(12 30 14)" />
        <path
          d="M24 22.5 C31 22.5 36 27 36 32.5 C36 38 30.5 41.5 24 41.5 C17.5 41.5 12 38 12 32.5 C12 27 17 22.5 24 22.5 Z"
          fill={fur}
        />
      </g>
      <g fill={outline}>
        <circle cx="20" cy="31" r="1.8" />
        <circle cx="28" cy="31" r="1.8" />
      </g>
      <path
        d="M24 35.8 l-2.2 -2 h4.4 Z"
        fill="#d98c8c"
        stroke={outline}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </Frame>
  );
}

function Bird({ size = 32 }: { size?: number }) {
  return (
    <Frame size={size}>
      <path
        d="M29 11 C36 11 40.5 16.5 40.5 22.5 C40.5 31.5 33 39 24 39 C15 39 8 33.5 8 26.5 C13 28.5 16 27 18 24 C20 19.5 22 11 29 11 Z"
        fill="#a8c4d8"
        stroke={outline}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <circle cx="31" cy="19.5" r="1.8" fill={outline} />
      <path
        d="M39.5 21.5 L46 24 L39.5 26.5 Z"
        fill="#e0a35e"
        stroke={outline}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Frame>
  );
}

function Fish({ size = 32 }: { size?: number }) {
  return (
    <Frame size={size}>
      <path
        d="M30 24 C30 16.5 22.5 11.5 15 13.5 C8 15.5 5 24 5 24 C5 24 8 32.5 15 34.5 C22.5 36.5 30 31.5 30 24 Z"
        fill="#f0b183"
        stroke={outline}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <path
        d="M29.5 24 L43 15.5 L43 32.5 Z"
        fill="#f0b183"
        stroke={outline}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <circle cx="13.5" cy="21" r="1.9" fill={outline} />
    </Frame>
  );
}

function Moon({ size = 32 }: { size?: number }) {
  return (
    <Frame size={size}>
      <path
        d="M33.5 31.5 C24.5 31.5 17 24 17 15 C17 12.1 17.8 9.3 19.2 6.9 C11.6 9.4 6 16.6 6 25 C6 35.5 14.5 44 25 44 C33.2 44 40.2 38.8 42.8 31.5 C40 32.5 36.8 31.5 33.5 31.5 Z"
        fill="#f3d99b"
        stroke={outline}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
    </Frame>
  );
}

function Cloud({ size = 32 }: { size?: number }) {
  return (
    <Frame size={size}>
      <path
        d="M15 35 C9.8 35 5.5 31.2 5.5 26.5 C5.5 21.9 9.6 18.1 14.4 18.1 C15.4 12.7 20.2 8.5 26 8.5 C32.3 8.5 37.5 13.2 38.3 19.2 C41.9 20.4 44.5 23.7 44.5 27.6 C44.5 31.7 41.3 35 37.3 35 Z"
        fill="#e6eef2"
        stroke={outline}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
    </Frame>
  );
}

function Rainbow({ size = 32 }: { size?: number }) {
  return (
    <Frame size={size}>
      <g fill="none" strokeLinecap="round" strokeWidth={4.6}>
        <path d="M7 37 A17 17 0 0 1 41 37" stroke="#e39a9a" />
        <path d="M13.5 37 A10.5 10.5 0 0 1 34.5 37" stroke="#f0c96b" />
        <path d="M20 37 A4 4 0 0 1 28 37" stroke="#9bb08a" />
      </g>
    </Frame>
  );
}

export const avatarPresets = [
  { id: "cat", label: "แมว", Icon: Cat },
  { id: "dog", label: "หมา", Icon: Dog },
  { id: "rabbit", label: "กระต่าย", Icon: Rabbit },
  { id: "bird", label: "นก", Icon: Bird },
  { id: "fish", label: "ปลา", Icon: Fish },
  { id: "star", label: "ดาว", Icon: Star },
  { id: "heart", label: "หัวใจ", Icon: Heart },
  { id: "flower", label: "ดอกไม้", Icon: Flower },
  { id: "apple", label: "ผลไม้", Icon: Apple },
  { id: "moon", label: "ดวงจันทร์", Icon: Moon },
  { id: "cloud", label: "เมฆ", Icon: Cloud },
  { id: "rainbow", label: "สายรุ้ง", Icon: Rainbow }
] as const;

/** ค่าที่เก็บในฐานข้อมูลของรูปสำเร็จรูป เช่น preset:cat */
export function presetAvatarValue(id: string) {
  return `${presetPrefix}${id}`;
}

/** วาดรูปสำเร็จรูปจากค่าที่เก็บไว้ — คืน null ถ้าไม่ใช่รูปสำเร็จรูป */
export function renderPresetAvatar(value: string | null | undefined, size = 32): ReactNode {
  if (!value || !value.startsWith(presetPrefix)) return null;

  const preset = avatarPresets.find((item) => item.id === value.slice(presetPrefix.length));

  if (!preset) return null;

  return <preset.Icon size={size} />;
}
