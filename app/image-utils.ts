// ย่อรูปในเบราว์เซอร์ก่อนอัปโหลด
// รูปจากกล้องมือถือมักใหญ่ 3-5 MB ถ้าส่งขึ้นตรง ๆ จะช้ามากบนเน็ตมือถือ
// ย่อให้ด้านยาวสุดไม่เกิน maxEdge แล้วแปลงเป็น JPEG — เหลือราว 100-300 KB

const maxEdge = 1200;
const jpegQuality = 0.82;

/** ย่อรูปให้เล็กลง ถ้าย่อไม่ได้ (เช่นเป็น SVG) จะคืนไฟล์เดิม */
export async function compressImage(file: File): Promise<File> {
  // SVG เป็นภาพเวกเตอร์ ไฟล์เล็กอยู่แล้ว และย่อผ่าน canvas จะเสียความคมชัด
  if (file.type === "image/svg+xml") return file;
  if (typeof createImageBitmap !== "function") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);

  if (!bitmap) return file;

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    return file;
  }

  // ทาพื้นขาวก่อน กัน PNG พื้นโปร่งใสกลายเป็นพื้นดำตอนแปลงเป็น JPEG
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolveBlob) => {
    canvas.toBlob(resolveBlob, "image/jpeg", jpegQuality);
  });

  // ย่อแล้วไม่เล็กลง (เช่นรูปเล็กอยู่แล้ว) ใช้ไฟล์เดิมดีกว่า
  if (!blob || blob.size >= file.size) return file;

  const name = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;

  return new File([blob], name, { type: "image/jpeg" });
}

/** แปลงไฟล์รูปเป็นข้อความ (data URL) เพื่อเก็บลงเครื่องและใช้เป็น src ได้เลย */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}
