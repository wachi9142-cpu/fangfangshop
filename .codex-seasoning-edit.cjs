const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const pagePath = path.join(cwd, "app", "page.tsx");
const src = "C:\\Users\\THES~1\\AppData\\Local\\Temp\\codex-clipboard-7971ac87-52d4-403b-b793-1acc4935a5fb.png";
const imgRel = "/product-images/seasoning/dek-somboon-light-soy-sauce-150ml.png";
const imgAbs = path.join(cwd, "public", "product-images", "seasoning", "dek-somboon-light-soy-sauce-150ml.png");
const name = "ซีอิ๊วขาว ตราเด็กสมบูรณ์ 150 มล.";
const productId = "seasoning-dek-somboon-light-soy-sauce-150ml";

fs.mkdirSync(path.dirname(imgAbs), { recursive: true });
if (fs.existsSync(src)) {
  fs.copyFileSync(src, imgAbs);
}

let s = fs.readFileSync(pagePath, "utf8");
const productBlock = `  {
    id: "${productId}",
    name: "${name}",
    category: "เครื่องปรุง",
    subcategory: "เครื่องปรุง",
    stock: 20,
    minStock: 5,
    unit: "ขวด",
    shelf: "ชั้นเครื่องปรุง",
    price: 0,
    updatedBy: "เจ้าของร้าน",
    imageUrl: "${imgRel}",
  },
`;

if (!s.includes(`id: "${productId}"`)) {
  const productRe = /(const\s+seasoningProducts[\s\S]*?=\s*\[\r?\n)/;
  if (!productRe.test(s)) throw new Error("seasoningProducts not found");
  s = s.replace(productRe, `$1${productBlock}`);
}

if (!s.includes(`"${name}": "${imgRel}"`)) {
  const imageMapRe = /(const\s+productImageByName[\s\S]*?=\s*\{\r?\n)/;
  if (!imageMapRe.test(s)) throw new Error("productImageByName not found");
  s = s.replace(imageMapRe, `$1  "${name}": "${imgRel}",\n`);
}

fs.writeFileSync(pagePath, s, "utf8");
fs.writeFileSync(path.join(cwd, ".codex-last-seasoning-edit.txt"), "OK", "utf8");
