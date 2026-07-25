"use client";

import {
  AppstoreOutlined,
  BellOutlined,
  CheckCircleFilled,
  LeftOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  HomeOutlined,
  InboxOutlined,
  LockOutlined,
  LoginOutlined,
  LogoutOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
  WarningFilled
} from "@ant-design/icons";
import {
  App,
  Badge,
  Button,
  Card,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Tag,
  Typography,
  Upload
} from "antd";
import type { UploadProps } from "antd";
import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type StockStatus = "พร้อมขาย" | "ใกล้หมด" | "หมด";

type Product = {
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

type ProductFormValues = {
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  updatedBy: string;
};

const storageKey = "fangfangshop-products";
const searchHistoryStorageKey = "fangfangshop-search-history";
const shopImageStorageKey = "fangfangshop-shop-image";
const defaultShopImageUrl = "/shop-images/fangfang-shop.png";
const authStorageKey = "fangfangshop-auth";

// ล็อกอินแบบง่ายสำหรับพนักงาน/เจ้าของร้าน (ยังไม่ใช้ backend)
// ปรับหรือเพิ่มบัญชีได้ที่นี่ เมื่อทำ backend จริงให้ย้ายไปตรวจสอบฝั่งเซิร์ฟเวอร์
type StaffAccount = { username: string; password: string; displayName: string };

const staffAccounts: StaffAccount[] = [
  { username: "owner", password: "1234", displayName: "เจ้าของร้าน" },
  { username: "staff", password: "1234", displayName: "พนักงานขาย" }
];
const smsRedImage = "/product-images/tobacco-soft/sms-red.svg";
const smsGreenImage = "/product-images/tobacco-soft/sms-green.svg";
const lmRedImage = "/product-images/tobacco-soft/lm-red.svg";
const lmGreenImage = "/product-images/tobacco-soft/lm-green.svg";
const anchorTobaccoImage = "/product-images/tobacco-soft/anchor-tobacco.svg";
const greenCatTobaccoImage = "/product-images/tobacco-soft/green-cat-tobacco.svg";
const anchorRollingPaperHardImage = "/product-images/anchor-rolling-paper-hard-real.png";
const chickenRollingPaperSoftImage = "/product-images/chicken-rolling-paper-real.png";

const productPriceByName: Record<string, number> = {
  "SMS แดง": 70,
  "SMS เขียว": 70,
  "LM แดง": 72,
  "LM เขียว": 72,
  ยาสูบตราแมวเขียว: 20,
  กระดาษแข็งตราสมอ: 2,
  ไฟแช็คคละสี: 10
};

const productStockByName: Record<string, number> = {
  "กาแฟเบอร์ดี้ ลาเต้ สูตรน้ำตาลน้อย กระป๋อง": 0,
  "กาแฟเบอร์ดี้ เอสเปรสโซ สูตรน้ำตาลน้อย กระป๋อง": 0,
  "กาแฟเบอร์ดี้ แบล็ค สูตรน้ำตาลน้อย กระป๋อง": 0,
  "กาแฟเบอร์ดี้ แบล็ค ซีโร่ กระป๋อง": 0,
  "กาแฟเบอร์ดี้ โรบัสต้า ซีโร่ กระป๋อง": 0,
  "สปาย Red": 20,
  "สปาย Classic": 20,
  "สปาย Butterfly Kiss": 0,
  "สปาย High Strawberry Daiquiri": 0,
  "สปาย Black": 0,
  "สปาย Moscato Gold": 0,
  "สปาย Sparkling Gold": 0,
  "สปาย Melon Sparkle": 0,
  "สปาย Angel Kiss": 0,
  "สปาย White": 0,
  "สปาย Blue": 0,
  "สปาย Kamikaze": 0,
  "สปาย Candy Kiss": 0,
  "สปาย Lollipop Kiss": 0,
  "สปาย High Lime": 0
};

const legacyProductNameMap: Record<string, string> = {
  "ตะวัน รสไก่เว้งซี่จี๊ด": "ตะวัน รสไก่วิงค์ซี๊ด",
  สิงห์กระป๋อง: "สิงห์กระป๋องยาว",
  เป็ปซี่กระป๋อง: "เป๊บซี่กระป๋อง",
  มิริด้าขวดเล็ก: "มิรินด้าขวดเล็ก",
  มิริด้าขวดใหญ่: "มิรินด้าขวดใหญ่",
  "มิริด้า ขวดเล็ก": "มิรินด้าขวดเล็ก",
  "มิริด้า ขวดใหญ่": "มิรินด้าขวดใหญ่",
  "Okashi โอคาชิ ปลาเส้นเส้นใหญ่ 150 กรัม รสปูอัด": "Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รสปูอัด",
  "Okashi โอคาชิ ปลาเส้นเส้นใหญ่ 150 กรัม รสดั้งเดิม": "Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รส ออริจินอล",
  "Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รสดั้งเดิม": "Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รส ออริจินอล",
  "Okashi โอคาชิ ปลาเส้นเล็ก 150 กรัม รสออริจินอล": "Okashi โอคาชิ ปลาเส้นเล็ก 150 กรัม รส ออริจินอล",
  สิงห์เลมอนโซดา: "สิงห์ เลมอน โซดา",
  "สิงห์โซดา เลมอน": "สิงห์ เลมอน โซดา",
  สิงห์ส้มโซดา: "สิงห์ เลมอน&บ๊วย โซดา",
  สไปรท์กระป๋อง: "สไปรท์ กระป๋อง",
  "สไปรท์ สูตรไม่มีน้ำตาล": "สไปรท์ สูตรไม่มีน้ำตาล (ฝาดำ)",
  "สไปรท์ไม่มีน้ำตาล": "สไปรท์ สูตรไม่มีน้ำตาล (ฝาดำ)",
  "สไปรท์ ฝาดำ": "สไปรท์ สูตรไม่มีน้ำตาล (ฝาดำ)",
  แฟนต้าสีแดง: "แฟนต้า น้ำแดง 15 บาท",
  "แฟนต้าน้ำแดง": "แฟนต้า น้ำแดง 15 บาท",
  "แฟนต้า น้ำแดง": "แฟนต้า น้ำแดง 15 บาท",
  "แฟนต้าน้ำแดง 15 บาท": "แฟนต้า น้ำแดง 15 บาท",
  "แฟนต้าน้ำแดง 10 บาท": "แฟนต้า น้ำแดง 10 บาท",
  "แฟนต้าสีแดง กระป๋อง": "แฟนต้า น้ำแดงกระป๋อง",
  "แฟนต้าสีแดง ขวดลิตร": "แฟนต้า น้ำแดงขวดลิตร",
  แฟนต้าสีแดงขวดใหญ่: "แฟนต้า น้ำแดงขวดลิตร",
  แฟนต้าสีเขียว: "แฟนต้า น้ำเขียวขวดเล็ก",
  แฟนต้าน้ำเขียว: "แฟนต้า น้ำเขียวขวดเล็ก",
  "แฟนต้า น้ำเขียว": "แฟนต้า น้ำเขียวขวดเล็ก",
  แฟนต้าสีเขียวขวดใหญ่: "แฟนต้า น้ำเขียวขวดลิตร",
  "แฟนต้าสีเขียว ขวดลิตร": "แฟนต้า น้ำเขียวขวดลิตร",
  แฟนต้าสีส้ม: "แฟนต้า น้ำส้มขวดเล็ก",
  "แฟนต้าน้ำส้ม": "แฟนต้า น้ำส้มขวดเล็ก",
  "แฟนต้า น้ำส้ม": "แฟนต้า น้ำส้มขวดเล็ก",
  น้ำเย็นเย็น: "เย็นเย็น จับเลี้ยง น้ำตาล 2%",
  เย็นเย็น: "เย็นเย็น จับเลี้ยง น้ำตาล 2%",
  "เย็นเย็นน้ำตาล2%": "เย็นเย็น จับเลี้ยง น้ำตาล 2%",
  "เย็นเย็นเก็กฮวย": "เย็นเย็น เก๊กฮวยน้ำผึ้ง",
  "เย็นเย็นเก๊กฮวย": "เย็นเย็น เก๊กฮวยน้ำผึ้ง",
  "เย็นเย็นรสสละพุทราจีน": "เย็นเย็น รสสละพุทราจีน",
  อิชิตัน: "อิชิตัน กรีนที รสต้นตำรับ",
  โออิชิ: "โออิชิ กรีนทีชาเขียว รสต้นตำรับ",
  "อิชิตัน กรีนทีน รสน้ำผึ่งผสมมะเลมอน": "อิชิตัน กรีนที รสน้ำผึ้งผสมมะนาว",
  "อิชิตันกรีนทีน รสน้ำผึ้งผสมเลมอน": "อิชิตัน กรีนที รสน้ำผึ้งผสมมะนาว",
  "โออิชิกรีนทีนชาเขียว รสต้นตำรับ": "โออิชิ กรีนทีชาเขียว รสต้นตำรับ",
  "อิชิตันรสต้นตำรับ": "อิชิตัน กรีนที รสต้นตำรับ",
  "อิชิตันรสจมูกข้าวญี่ปุ่น": "อิชิตัน กรีนที รสจมูกข้าวญี่ปุ่น",
  "น้ำตาลมิตรผล ขาวบริสุทธิ์ 1 กิโลกรัม": "น้ำตาลทรายขาวมิตรผล 1 กิโลกรัม",
  "น้ำตาลมิตรผล อ้อยธรรมชาติ 1 กิโลกรัม": "น้ำตาลทรายแดงมิตรผล 1 กิโลกรัม",
  น้ำคริสตัสจิ๋วยกแพ็ค: "น้ำคริสตัลจิ๋วยกแพ็ก",
  น้ำคริสตัสจิ๋วยกแพ็ก: "น้ำคริสตัลจิ๋วยกแพ็ก",
  น้ำคริสตัสขวดใหญ่ยกแพ็ค: "น้ำคริสตัลขวดใหญ่ยกแพ็ก",
  น้ำคริสตัสขวดใหญ่ยกแพ็ก: "น้ำคริสตัลขวดใหญ่ยกแพ็ก",
  น้ำคริสตัสขวดเล็กยกแพ็ค: "น้ำคริสตัลขวดเล็กยกแพ็ก",
  น้ำคริสตัสขวดเล็กยกแพ็ก: "น้ำคริสตัลขวดเล็กยกแพ็ก",
  น้ำดื่มขวดจิ๋ว: "น้ำคริสตัลขวดจิ๋ว",
  น้ำคริสตัสขวดจิ๋ว: "น้ำคริสตัลขวดจิ๋ว",
  "ยันฮีฝาขวด": "น้ำดื่มยันฮี ฝาขาว",
  "ยันฮีฝาขาว": "น้ำดื่มยันฮี ฝาขาว",
  "ยันฮีฝาเหลือง": "น้ำดื่มยันฮี ฝาเหลือง",
  เนสกาแฟกระป๋อง: "เนสกาแฟกระป๋องเขียว เอสเปรสโซ โรสต์",
  กาแฟเบอร์ดี้กระป๋อง: "กาแฟเบอร์ดี้แดง โรบัสต้า กระป๋อง",
  ลีโฮขวด: "ลีโอขวด",
  ลีโฮกระป๋อง: "ลีโอกระป๋องยาว",
  ลีโฮกระป๋องยาว: "ลีโอกระป๋องยาว",
  ลีโฮกระป๋องสั้น: "ลีโอกระป๋องสั้น",
  ช้างกระป๋อง: "ช้างกระป๋องยาว",
  นิยมไทยขวดใหญ่: "สุรานิยมไทยขวดใหญ่",
  สปาย: "สปาย Red"
};

const productImageByName: Record<string, string> = {
  // บะหมี่กึ่งสำเร็จรูป
  "มาม่า รสหมูสับ": "/product-images/noodles/mama-moo-sap.png",
  "มาม่า รสเย็นตาโฟต้มยำหม้อไฟ": "/product-images/noodles/mama-yentafo.png",
  "มาม่า รสต้มยำกุ้งน้ำข้น": "/product-images/noodles/mama-tomyum-nam-khon.png",
  "ไวไว ปรุงสำเร็จ": "/product-images/noodles/waiwai-prung-samret.png",
  "ไวไว รสหมูสับ": "/product-images/noodles/waiwai-moo-sap.png",
  "ไวไว รสหมูสับต้มยำ": "/product-images/noodles/waiwai-moo-sap-tomyum.png",
  "ไวไว รสหอยลายผัดฉ่า แห้ง": "/product-images/noodles/waiwai-hoi-lai-pad-cha.png",
  "ไวไว เส้นหมี่ปรุงรส": "/product-images/noodles/waiwai-sen-mee-prung-rot.png",
  "ควิกแซ่บ คัพ รสต้มยำพริกเผา": "/product-images/noodles/quick-cup-tomyum-prik-pao.png",
  "ควิกแซ่บ คัพ รสต้มโคล้ง": "/product-images/noodles/quick-cup-tom-klong.png",
  "ควิกแซ่บ คัพ รสต้มยำมันกุ้ง": "/product-images/noodles/quick-cup-tomyum-man-kung.png",
  "ควิกแซ่บ คัพ รสกุ้งนึ่งมะนาว": "/product-images/noodles/quick-cup-kung-nueng-manao.png",
  "ควิกแซ่บ รสต้มโคล้ง": "/product-images/noodles/quick-tom-klong.png",
  "ควิกแซ่บ รสกุ้งนึ่งมะนาว": "/product-images/noodles/quick-kung-nueng-manao.png",
  "ควิกแซ่บ รสต้มยำมันกุ้ง": "/product-images/noodles/quick-tomyum-man-kung.png",
  "นิสชิน คัพ รสสไปซี่ (แบบแห้ง)": "/product-images/noodles/nissin-cup-spicy.png",
  "นิสชิน คัพ รสไก่เผ็ดเกาหลีชีส (แบบแห้ง)": "/product-images/noodles/nissin-cup-cheese.png",
  "นิสชิน คัพ รสไก่ข้าวโพด": "/product-images/noodles/nissin-cup-chicken-corn.png",
  // ปฐมพยาบาล
  สำลีก้อน: "/product-images/first-aid/cotton-ball.png",
  "คอตตอนบัด ตราไวท์แรบบิท": "/product-images/first-aid/cotton-bud-white-rabbit.png",
  "สำลีก้าน ตรารถพยาบาล": "/product-images/first-aid/cotton-bud-ambulance.png",
  น้ำแข็งก้อน: "/product-images/ice/ice-cube.png",
  น้ำแข็งหลอดใหญ่: "/product-images/ice/ice-tube-large.png",
  น้ำแข็งหลอดเล็ก: "/product-images/ice/ice-tube-small.png",
  // ยาสามัญประจำบ้าน
  "ไลมาริน ครีม (Lymarin Cream)": "/product-images/medicine/lymarin.png",
  "คาดรามีน-วี โลชั่น (Cadramine-V Lotion)": "/product-images/medicine/cadramine-v.png",
  "คาลาไมน์ โลชั่น (Calamine Lotion)": "/product-images/medicine/calamine-lotion.png",
  "ฟังจิเดอร์ม-บี ครีม (Fungiderm-B Cream)": "/product-images/medicine/fungiderm-b.png",
  "ซีมา ครีม รักษาฮ่องกงฟุต (Zema Cream)": "/product-images/medicine/zema.png",
  "โทนาฟ ครีม (TONAF Cream)": "/product-images/medicine/tonaf.png",
  "ยาครีมโคลไทรมาโซล 1% (Clotrimazole)": "/product-images/medicine/clotrimazole.png",
  "แฟงโก้-บี ครีม (Fango-B Cream)": "/product-images/medicine/fango-b.png",
  "เบตาดีน น้ำยาใส่แผล (Betadine Antiseptic)": "/product-images/medicine/betadine-antiseptic.png",
  "ยากษัยเส้น ตราเด็กในพานทอง": "/product-images/medicine/kasaisen-dek-nai-phan-thong.png",
  "ยาแก้ตัวร้อน ตราเขากวาง": "/product-images/medicine/kaokwang-fever.png",
  "ยาน้ำเขากุ้ย (Kao-Kui Water)": "/product-images/medicine/kao-kui-water.png",
  "ยาหอม ตรา 5 เจดีย์": "/product-images/medicine/yahom-5-chedi.png",
  "ขมิ้นชัน แคปซูล ตราอภัยภูเบศร": "/product-images/medicine/turmeric-abhaibhubejhr.png",
  "วิกส์ วาโปรับ (Vicks VapoRub)": "/product-images/medicine/vicks-vaporub.png",
  "ยาหม่องตราถ้วยทอง 2493": "/product-images/medicine/golden-cup-2493.png",
  "ยาหม่องตราเสือ (Tiger Balm HR)": "/product-images/medicine/tiger-balm-hr.png",
  ยาหม่องตราวังว่าน: "/product-images/medicine/wangwan-balm.png",
  "ยาหม่องเสลดพังพอน ตราหมอเอี้ยง": "/product-images/medicine/saledphangphon-balm.png",
  "ยาหม่องไพล (Compound Phlai Balm)": "/product-images/medicine/phlai-balm-mor-iang.png",
  "ดาเนสเทน ยาครีมฆ่าเชื้อรา (Danesten)": "/product-images/medicine/danesten.png",
  "ฟ้าทะลายโจร แคปซูล ตราอภัยภูเบศร": "/product-images/medicine/fathalaichon-abhaibhubejhr.png",
  // ขนม - ยำยำ ช้างน้อย
  "ยำยำ ช้างน้อย รสบาร์บีคิว": "/product-images/snack/yumyum-changnoi-bbq.png",
  "ยำยำ ช้างน้อย รสซุปเปอร์เลมอน": "/product-images/snack/yumyum-changnoi-lemon.png",
  "ยำยำ ช้างน้อย รสข้าวโพด": "/product-images/snack/yumyum-changnoi-corn.png",
  "ยำยำ ช้างน้อย รสต้มยำกุ้ง": "/product-images/snack/yumyum-changnoi-tomyum.png",
  "ซีอิ๊วขาว ตราเด็กสมบูรณ์ 150 มล.": "/product-images/seasoning/dek-somboon-light-soy-sauce-150ml.png",
  "Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รส ออริจินอล": "/product-images/okashi-pet-snack-original.png",
  "Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รสปูอัด": "/product-images/okashi-pet-snack-crab-stick.png",
  "Okashi โอคาชิ ปลาเส้นเล็ก 150 กรัม รสปูอัด": "/product-images/okashi-pet-snack-small-crab-stick.png",
  "Okashi โอคาชิ ปลาเส้นเล็ก 150 กรัม รส ออริจินอล": "/product-images/okashi-pet-snack-small-original.png",
  "Okashi โอคาชิ ปลาเส้นเล็ก 150 กรัม รสปูอัด&ออริจินอล": "/product-images/okashi-pet-snack-small-crab-original-150g.png",
  "Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รสปูอัด&ออริจินอล": "/product-images/okashi-pet-snack-large-crab-original-150g.png",
  "Okashi โอคาชิ ปลาเส้นเล็ก 300 กรัม รสออริจินอล": "/product-images/okashi-pet-snack-small-original-300g.png",
  "Okashi โอคาชิ ปลาเส้นเล็ก 80 กรัม รสออริจินอล": "/product-images/okashi-pet-snack-small-original-80g.png",
  "Okashi โอคาชิ ปลาเส้นเล็ก 300 กรัม รสปูอัด": "/product-images/okashi-pet-snack-small-crab-stick-300g.png",
  "Okashi โอคาชิ ปลาเส้นใหญ่ 300 กรัม รสปูอัด": "/product-images/okashi-pet-snack-large-crab-stick-300g.png",
  "Okashi โอคาชิ ปลาเส้นใหญ่ 300 กรัม รสปูอัด&ออริจินอล": "/product-images/okashi-pet-snack-large-crab-original-300g.png",
  "Okashi โอคาชิ ไก่พันปลาเส้น 17 ชิ้น": "/product-images/okashi-chicken-wrap-fish-stick-17pcs.png",
  สิงห์โซดาวันเวย์: "/product-images/singha-soda-one-way.png",
  "สิงห์ เลมอน โซดา": "/product-images/singha-soda-lemon.png",
  "สิงห์ เลมอน&บ๊วย โซดา": "/product-images/singha-soda-lemon-plum.png",
  "สิงห์ แดงเลมอน โซดา": "/product-images/singha-soda-red-lemon.png",
  "สิงห์ พิงค์เลมอน โซดา": "/product-images/singha-soda-pink-lemon.png",
  "สิงห์ ยูซุเลมอน โซดา": "/product-images/singha-soda-yuzu-lemon.png",
  "สิงห์ เมล่อนเลมอน โซดา": "/product-images/singha-soda-melon-lemon.png",
  "สิงห์ เลมอนครีม โซดา": "/product-images/singha-soda-lemon-cream.png",
  สไปรท์: "/product-images/sprite-bottle.png",
  "สไปรท์ กระป๋อง": "/product-images/sprite-can.png",
  "สไปรท์ สูตรไม่มีน้ำตาล (ฝาดำ)": "/product-images/sprite-zero-black-cap.png",
  "แฟนต้า น้ำแดง 15 บาท": "/product-images/fanta-red-15-bottle.png",
  "แฟนต้า น้ำแดง 10 บาท": "/product-images/fanta-red-10-bottle.png",
  "แฟนต้า น้ำแดงกระป๋อง": "/product-images/fanta-red-can.png",
  "แฟนต้า น้ำแดงขวดลิตร": "/product-images/fanta-red-liter-bottle.png",
  เป๊บซี่กระป๋อง: "/product-images/pepsi-can.png",
  "แฟนต้า น้ำเขียวขวดเล็ก": "/product-images/fanta-green-small-bottle.png",
  "แฟนต้า น้ำเขียวขวดลิตร": "/product-images/fanta-green-liter-bottle.png",
  "แฟนต้า น้ำเขียวกระป๋อง": "/product-images/fanta-green-can.png",
  "แฟนต้า น้ำส้มกระป๋อง": "/product-images/fanta-orange-can.png",
  "แฟนต้า น้ำส้มขวดเล็ก": "/product-images/fanta-orange-small-bottle.png",
  "เย็นเย็น เก๊กฮวยน้ำผึ้ง": "/product-images/yen-yen-chrysanthemum-honey.png",
  "เย็นเย็น จับเลี้ยง น้ำตาล 2%": "/product-images/yen-yen-jubliang-2-percent-sugar.png",
  "เย็นเย็น รสสละพุทราจีน": "/product-images/yen-yen-sala-chinese-date.png",
  น้ำจับใจ: "/product-images/jubjai-herbal-tea.png",
  "โออิชิ กรีนที รสแตงโม": "/product-images/oishi-green-tea-watermelon.png",
  "โออิชิ กรีนทีชาเขียว รสต้นตำรับ": "/product-images/oishi-genki-original-green-tea.png",
  "อิชิตัน กรีนที รสต้นตำรับ": "/product-images/ichitan-original-green-tea.png",
  "อิชิตัน กรีนที รสน้ำผึ้งผสมมะนาว": "/product-images/ichitan-green-tea-honey-lemon.png",
  "อิชิตัน กรีนที รสจมูกข้าวญี่ปุ่น": "/product-images/ichitan-japanese-rice-tea.png",
  "กาแฟเบอร์ดี้แดง โรบัสต้า กระป๋อง": "/product-images/birdy-robusta-red-can.png",
  "กาแฟเบอร์ดี้ ลาเต้ สูตรน้ำตาลน้อย กระป๋อง": "/product-images/birdy-latte-less-sugar-can.png",
  "กาแฟเบอร์ดี้ เอสเปรสโซ สูตรน้ำตาลน้อย กระป๋อง": "/product-images/birdy-espresso-less-sugar-can.png",
  "กาแฟเบอร์ดี้ แบล็ค สูตรน้ำตาลน้อย กระป๋อง": "/product-images/birdy-black-less-sugar-can.png",
  "กาแฟเบอร์ดี้ แบล็ค ซีโร่ กระป๋อง": "/product-images/birdy-black-zero-can.png",
  "กาแฟเบอร์ดี้ โรบัสต้า ซีโร่ กระป๋อง": "/product-images/birdy-robusta-zero-can.png",
  "เนสกาแฟกระป๋องเขียว เอสเปรสโซ โรสต์": "/product-images/nescafe-espresso-roast-green-can.png",
  "เนสกาแฟซองเขียว Blend & Brew 3 in 1": "/product-images/nescafe-blend-brew-green-sachet.png",
  "เนสกาแฟซองแดง Blend & Brew Rich Aroma": "/product-images/nescafe-blend-brew-red-sachet.png",
  "แบรนด์รังนกแท้ คลาสสิค ผสมน้ำตาลกรวด ขวดเล็ก": "/product-images/brands-bird-nest-classic-small.png",
  "แบรนด์ซุปไก่สกัด สูตรต้นตำรับ 42 มล. ขวดเล็ก": "/product-images/brands-chicken-essence-original-42ml.png",
  "แบรนด์วีต้า พรุนสกัดเข้มข้นผสมวิตามิน ขวดเล็ก": "/product-images/brands-veta-prune-vitamin-small.png",
  "แบรนด์วีต้า ลูทีน แบล็คเคอร์แรนต์ ขวดเล็ก": "/product-images/brands-veta-lutein-blackcurrant-small.png",
  "แบรนด์วีต้า วิตามินมิกซ์ ขวดเล็ก": "/product-images/brands-veta-vitamin-mix-small.png",
  "แบรนด์วีต้า วิตามิน A เบอร์รี่ ขวดเล็ก": "/product-images/brands-veta-vitamin-a-berry-small.png",
  น้ำวีด้าขวดเล็กยกแพ็ก: "/product-images/vida-small-water-pack.png",
  น้ำทิพย์ขวดเล็กยกแพ็ก: "/product-images/namthip-small-water-pack.png",
  น้ำทิพย์ขวดใหญ่ยกแพ็ก: "/product-images/namthip-large-water-pack.png",
  น้ำคริสตัลจิ๋วยกแพ็ก: "/product-images/crystal-mini-water-pack.png",
  น้ำคริสตัลขวดใหญ่ยกแพ็ก: "/product-images/crystal-large-water-pack.png",
  น้ำคริสตัลขวดเล็กยกแพ็ก: "/product-images/crystal-small-water-pack.png",
  น้ำทิพย์ขวดเล็ก: "/product-images/namthip-small-water-bottle.png",
  น้ำทิพย์ขวดใหญ่: "/product-images/namthip-large-water-bottle.png",
  "น้ำดื่มยันฮี ฝาขาว": "/product-images/yanhee-white-cap-water.png",
  "น้ำดื่มยันฮี ฝาเหลือง": "/product-images/yanhee-yellow-cap-water.png",
  น้ำดื่มคริสตัลขวดเล็ก: "/product-images/crystal-small-water-bottle.png",
  น้ำดื่มคริสตัลขวดใหญ่: "/product-images/crystal-large-water-bottle.png",
  น้ำคริสตัลขวดจิ๋ว: "/product-images/crystal-mini-water-bottle.png",
  "น้ำตาลทรายขาวมิตรผล 1 กิโลกรัม": "/product-images/mitr-phol-white-sugar-1kg.png",
  "น้ำตาลทรายแดงมิตรผล 1 กิโลกรัม": "/product-images/mitr-phol-brown-sugar-1kg.png",
  "น้ำปลาแท้ตราทิพรส ขวดเล็ก": "/product-images/tiparos-fish-sauce-small-round.png",
  "น้ำปลาแท้ตราทิพรส ขวดเล็ก ทรงสูง": "/product-images/tiparos-fish-sauce-small-tall.png",
  "น้ำปลาร้าแซ่บไมค์": "/product-images/zab-mike-fermented-fish-sauce.png",
  "กะทิชาวเกาะ 500ml": "/product-images/chaokoh-coconut-milk-500ml.png",
  "ทิงเกอร์เบลล์ (Tinkerbell) รสปลาหิมะ โซเดียมต่ำ": "/product-images/tinkerbell-cat-treat-snow-fish.png",
  "ทิงเกอร์เบลล์ (Tinkerbell) รสแซลมอน โซเดียมต่ำ": "/product-images/tinkerbell-cat-treat-salmon.png",
  "ทิงเกอร์เบลล์ (Tinkerbell) รสทูน่า โซเดียมต่ำ": "/product-images/tinkerbell-cat-treat-tuna.png",
  "ทิงเกอร์เบลล์ (Tinkerbell) รสเนื้อวัว โซเดียมต่ำ": "/product-images/tinkerbell-cat-treat-beef.png",
  "ทิงเกอร์เบลล์ (Tinkerbell) รสเนื้อวัวผสมเนื้อแกะ โซเดียมต่ำ": "/product-images/tinkerbell-cat-treat-beef-lamb.png",
  "SMS แดง": smsRedImage,
  "SMS เขียว": smsGreenImage,
  "LM แดง": lmRedImage,
  "LM เขียว": lmGreenImage,
  ยาสูบตราสมอ: anchorTobaccoImage,
  ยาสูบตราแมวเขียว: greenCatTobaccoImage,
  กระดาษแข็งตราสมอ: anchorRollingPaperHardImage,
  กระดาษอ่อนตราไก่: chickenRollingPaperSoftImage,
  ไฟแช็คคละสี: "/product-images/lighter-mixed-color.png",
  น้ำแตงโม: "/product-images/herbal-drinks/watermelon-juice.jpg",
  น้ำเก๊กฮวย: "/product-images/herbal-drinks/chrysanthemum-beverage.jpg",
  น้ำเฉาก๊วย: "/product-images/herbal-drinks/grass-jelly-drink.jpg",
  น้ำตะไคร้ใบเตย: "/product-images/herbal-drinks/lemongrass-pandan-drink.jpg",
  น้ำทับทิม: "/product-images/herbal-drinks/pomegranate-juice.jpg",
  น้ำกระเจี๊ยบ: "/product-images/herbal-drinks/roselle-herbal-drink.jpg",
  น้ำข้าวโพด: "/product-images/herbal-drinks/corn-beverage.jpg",
  น้ำขิง: "/product-images/herbal-drinks/ginger-juice.jpg",
  "น้ำถั่ว 5 สี": "/product-images/herbal-drinks/five-color-beans-drink.jpg",
  น้ำเตยหอม: "/product-images/herbal-drinks/aromatic-pandan-drink.jpg",
  น้ำใบบัวบก: "/product-images/herbal-drinks/fresh-pandan-juice.jpg",
  น้ำมะนาว: "/product-images/herbal-drinks/lime-juice.jpg",
  น้ำมะพร้าว: "/product-images/herbal-drinks/coconut-water.jpg",
  น้ำส้ม: "/product-images/herbal-drinks/fresh-orange-juice.jpg",
  น้ำเสาวรส: "/product-images/herbal-drinks/passionfruit-juice.jpg",
  น้ำฟักทอง: "/product-images/herbal-drinks/pumpkin-juice.jpg",
  น้ำมะม่วงหาวมะนาวโห่: "/product-images/herbal-drinks/fresh-karonda-juice.jpg",
  น้ำองุ่น: "/product-images/herbal-drinks/grape-juice.jpg",
  น้ำอัญชันมะนาว: "/product-images/herbal-drinks/butterfly-pea-lemonade.jpg",
  "ขนมไทย ตะโก้กะทิ": "/product-images/thai-desserts/thai-tako-coconut-pudding.jpg",
  "ขนมไทย บัวลอย": "/product-images/thai-desserts/bua-loy.jpg",
  สิงห์ขวด: "/product-images/alcohol/singha-bottle.svg",
  สิงห์กระป๋องยาว: "/product-images/alcohol/singha-long-can-real.png",
  สิงห์กระป๋องสั้น: "/product-images/alcohol/singha-short-can-real.png",
  ลีโอขวด: "/product-images/alcohol/leo-bottle-real.png",
  ลีโอกระป๋องยาว: "/product-images/alcohol/leo-long-can.svg",
  ลีโอกระป๋องสั้น: "/product-images/alcohol/leo-short-can-real.png",
  ช้างขวด: "/product-images/alcohol/chang-bottle.svg",
  ช้างกระป๋องยาว: "/product-images/alcohol/chang-long-can.svg",
  ช้างกระป๋องสั้น: "/product-images/alcohol/chang-short-can.svg",
  หงส์ทองกลม: "/product-images/alcohol/hong-thong-round-real.png",
  หงส์ทองแบน: "/product-images/alcohol/hong-thong-flat.svg",
  เสือดำเล็ก: "/product-images/alcohol/suea-dam-small.svg",
  เสือดำขวดแบน: "/product-images/alcohol/suea-dam-flat.svg",
  เหล้าขาว: "/product-images/alcohol/white-liquor.svg",
  รีเจนซี่กลม: "/product-images/alcohol/regency-round.svg",
  รีเจนซี่แบน: "/product-images/alcohol/regency-flat.svg",
  "ฟลูมูน Full Moon": "/product-images/alcohol/full-moon.svg",
  สปาย: "/product-images/alcohol/spy-bottle.svg",
  "สปาย Classic": "/product-images/alcohol/spy-classic.png",
  "สปาย Butterfly Kiss": "/product-images/alcohol/spy-butterfly-kiss.png",
  "สปาย High Strawberry Daiquiri": "/product-images/alcohol/spy-high-strawberry-daiquiri.png",
  "สปาย Black": "/product-images/alcohol/spy-black.png",
  "สปาย Red": "/product-images/alcohol/spy-red.png",
  "สปาย Moscato Gold": "/product-images/alcohol/spy-moscato-gold.png",
  "สปาย Sparkling Gold": "/product-images/alcohol/spy-sparkling-gold.png",
  "สปาย Melon Sparkle": "/product-images/alcohol/spy-melon-sparkle.png",
  "สปาย Angel Kiss": "/product-images/alcohol/spy-angel-kiss.png",
  "สปาย White": "/product-images/alcohol/spy-white.png",
  "สปาย Blue": "/product-images/alcohol/spy-blue.png",
  "สปาย Kamikaze": "/product-images/alcohol/spy-kamikaze.png",
  "สปาย Candy Kiss": "/product-images/alcohol/spy-candy-kiss.png",
  "สปาย Lollipop Kiss": "/product-images/alcohol/spy-lollipop-kiss.png",
  "สปาย High Lime": "/product-images/alcohol/spy-high-lime.png",
  นิยมไทยขวดเล็ก: "/product-images/alcohol/niyomthai-bottle.png",
  สุรานิยมไทยขวดใหญ่: "/product-images/alcohol/niyomthai-large-bottle.png",
  "285 กลม": "/product-images/alcohol/blend-285-round.png"
};

// รูปแยกตาม "แบบ" ของสินค้า (สำหรับสินค้าที่ชื่อซ้ำกันแต่คนละแบบ) — คีย์ = `ชื่อ | sizeLabel`
// ถ้ามีคีย์ตรงนี้ จะใช้อันนี้ก่อน productImageByName ทำให้แต่ละแบบมีรูปของตัวเอง
const productImageByKey: Record<string, string> = {
  "พิมเสนน้ำ ตราโป๊ยเซียน | แบบตลับ": "/product-images/medicine/pimsen-nam-poysian.png"
};

// ชื่อสินค้าที่ "รูปต้องมาจาก productImageByKey เท่านั้น" (ชื่อซ้ำหลายแบบ) — แบบที่ไม่มีรูปให้เว้นว่าง
// hydrateProduct จะยึดค่านี้เป็นหลัก ล้างรูปเก่าที่ค้างใน localStorage ทิ้ง
const perVariantOnlyNames = new Set<string>(["พิมเสนน้ำ ตราโป๊ยเซียน"]);

const layLargeProductImageByName: Record<string, string> = {
  "เลย์รสออริจินัล (มันฝรั่งแท้ แผ่นเรียบ/แผ่นหยัก)": "/product-images/lay-large/lay-original.png",
  เลย์รสโนริสาหร่าย: "/product-images/lay-large/lay-nori-seaweed.png",
  เลย์รสหมึกย่างฮอตชิลลี่: "/product-images/lay-large/lay-hot-chili-squid.png",
  "เลย์รส 2 in 1 รสกุ้งเผา+น้ำจิ้มซีฟู้ด": "/product-images/lay-large/lay-2in1-grilled-prawn-seafood.png",
  เลย์รสไข่เค็ม: "/product-images/lay-large/lay-salted-egg.png",
  เลย์รสกะเพรากรอบ: "/product-images/lay-large/lay-sweet-basil.png",
  เลย์รสมะเขือเทศ: "/product-images/lay-large/lay-tomato.png",
  เลย์รสซาวครีมและหัวหอม: "/product-images/lay-large/lay-sour-cream-onion.png",
  เลย์รสเมี่ยงคำครบรส: "/product-images/lay-large/lay-mieng-kam.png",
  เลย์เพลย์รสบาร์บีคิว: "/product-images/lay-large/lay-play-bbq.png",
  เลย์เพลย์รสสาหร่ายทรงเครื่อง: "/product-images/lay-large/lay-play-seaweed.png",
  เลย์กลิ่นชีสและเบคอน: "/product-images/lay-large/lay-cheese-bacon.png",
  เลย์กลิ่นสโมคกี้บาร์บีคิว: "/product-images/lay-large/lay-smoky-bbq.png",
  เลย์รสสไปซี่โคเรียนราเมน: "/product-images/lay-large/lay-spicy-korean-ramen.png",
  เลย์รสมะนาวพริกจี๊ดจ๊าด: "/product-images/lay-large/lay-lime-chili.png",
  เลย์สแต็กซ์รสซาวครีมและหัวหอม: "/product-images/lay-large/lay-stax-sour-cream-onion.png",
  เลย์รสหอยเชลล์อบเนยกระเทียม: "/product-images/lay-large/lay-scallop-garlic-butter.png"
};

const layFlavors = [
  { name: "เลย์รสออริจินัล (มันฝรั่งแท้ แผ่นเรียบ/แผ่นหยัก)" },
  { name: "เลย์รสโนริสาหร่าย" },
  { name: "เลย์รสเอ็กซ์ตร้าบาร์บีคิว" },
  { name: "เลย์รสซาวครีมและหัวหอม" },
  { name: "เลย์รสเมี่ยงคำครบรส" },
  { name: "เลย์รสหมึกย่างฮอตชิลลี่" },
  { name: "เลย์รส 2 in 1 รสกุ้งเผา+น้ำจิ้มซีฟู้ด" },
  { name: "เลย์รสไข่เค็ม" },
  { name: "เลย์รสชีสและหัวหอม" },
  { name: "เลย์รสกะเพรากรอบ" },
  { name: "เลย์รสลาบทอด" },
  { name: "เลย์รสต้มยำกุ้ง" },
  { name: "เลย์รสปูผัดผงกะหรี่" },
  { name: "เลย์รสลาบ" },
  { name: "เลย์รสแกงเขียวหวาน" },
  { name: "เลย์รสมะนาวจี๊ดจ๊าด" },
  { name: "เลย์รสมะเขือเทศ" },
  { name: "เลย์กลิ่นบัตเตอร์คอร์น" },
  { name: "เลย์รสพริกปีศาจเอ็กซ์ตร้าชิลลี่" },
  { name: "เลย์รสบาร์บีคิวพริกพ่นไฟ" },
  { name: "เลย์รสบิงซูเมลอน" },
  { name: "เลย์รสไอซ์ซี่เลมอน" },
  { name: "เลย์เพลย์รสบาร์บีคิว" },
  { name: "เลย์เพลย์รสสาหร่ายทรงเครื่อง" },
  { name: "เลย์กลิ่นชีสและเบคอน" },
  { name: "เลย์กลิ่นสโมคกี้บาร์บีคิว" },
  { name: "เลย์รสสไปซี่โคเรียนราเมน" },
  { name: "เลย์รสมะนาวพริกจี๊ดจ๊าด" },
  { name: "เลย์สแต็กซ์รสซาวครีมและหัวหอม" },
  { name: "เลย์รสหอยเชลล์อบเนยกระเทียม" }
];

const layProducts: Product[] = layFlavors.flatMap((flavor, index) => [
  {
    id: 1000 + index * 2,
    name: flavor.name,
    category: "เลย์",
    stock: 18,
    minStock: 8,
    unit: "ซองเล็ก",
    price: 5,
    sizeLabel: "ซองเล็ก",
    updatedBy: "เจ้าของร้าน",
    imageUrl: layLargeProductImageByName[flavor.name]
  },
  {
    id: 1001 + index * 2,
    name: flavor.name,
    category: "เลย์",
    stock: 18,
    minStock: 8,
    unit: "ซองใหญ่",
    price: 20,
    sizeLabel: "ซองใหญ่",
    updatedBy: "เจ้าของร้าน",
    imageUrl: layLargeProductImageByName[flavor.name]
  }
]);

const petProducts: Product[] = [
  {
    id: 2099,
    name: "Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รส ออริจินอล",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "150 กรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รส ออริจินอล"]
  },
  {
    id: 2098,
    name: "Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รสปูอัด",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "150 กรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รสปูอัด"]
  },
  {
    id: 2097,
    name: "Okashi โอคาชิ ปลาเส้นเล็ก 150 กรัม รสปูอัด",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "150 กรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["Okashi โอคาชิ ปลาเส้นเล็ก 150 กรัม รสปูอัด"]
  },
  {
    id: 2096,
    name: "Okashi โอคาชิ ปลาเส้นเล็ก 150 กรัม รส ออริจินอล",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "150 กรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["Okashi โอคาชิ ปลาเส้นเล็ก 150 กรัม รส ออริจินอล"]
  },
  {
    id: 2093,
    name: "Okashi โอคาชิ ปลาเส้นเล็ก 150 กรัม รสปูอัด&ออริจินอล",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "150 กรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["Okashi โอคาชิ ปลาเส้นเล็ก 150 กรัม รสปูอัด&ออริจินอล"]
  },
  {
    id: 2092,
    name: "Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รสปูอัด&ออริจินอล",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "150 กรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["Okashi โอคาชิ ปลาเส้นใหญ่ 150 กรัม รสปูอัด&ออริจินอล"]
  },
  {
    id: 2095,
    name: "Okashi โอคาชิ ปลาเส้นเล็ก 300 กรัม รสออริจินอล",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "300 กรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["Okashi โอคาชิ ปลาเส้นเล็ก 300 กรัม รสออริจินอล"]
  },
  {
    id: 2094,
    name: "Okashi โอคาชิ ปลาเส้นเล็ก 80 กรัม รสออริจินอล",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "80 กรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["Okashi โอคาชิ ปลาเส้นเล็ก 80 กรัม รสออริจินอล"]
  },
  {
    id: 2088,
    name: "Okashi โอคาชิ ปลาเส้นเล็ก 300 กรัม รสปูอัด",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "300 กรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["Okashi โอคาชิ ปลาเส้นเล็ก 300 กรัม รสปูอัด"]
  },
  {
    id: 2090,
    name: "Okashi โอคาชิ ปลาเส้นใหญ่ 300 กรัม รสปูอัด",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "300 กรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["Okashi โอคาชิ ปลาเส้นใหญ่ 300 กรัม รสปูอัด"]
  },
  {
    id: 2089,
    name: "Okashi โอคาชิ ปลาเส้นใหญ่ 300 กรัม รสปูอัด&ออริจินอล",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "300 กรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["Okashi โอคาชิ ปลาเส้นใหญ่ 300 กรัม รสปูอัด&ออริจินอล"]
  },
  {
    id: 2091,
    name: "Okashi โอคาชิ ไก่พันปลาเส้น 17 ชิ้น",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "17 ชิ้น",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["Okashi โอคาชิ ไก่พันปลาเส้น 17 ชิ้น"]
  },
  {
    id: 2100,
    name: "ทิงเกอร์เบลล์ (Tinkerbell) รสปลาหิมะ โซเดียมต่ำ",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ซอง",
    price: 5,
    sizeLabel: "ซอง",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["ทิงเกอร์เบลล์ (Tinkerbell) รสปลาหิมะ โซเดียมต่ำ"]
  },
  {
    id: 2101,
    name: "ทิงเกอร์เบลล์ (Tinkerbell) รสแซลมอน โซเดียมต่ำ",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ซอง",
    price: 5,
    sizeLabel: "ซอง",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["ทิงเกอร์เบลล์ (Tinkerbell) รสแซลมอน โซเดียมต่ำ"]
  },
  {
    id: 2102,
    name: "ทิงเกอร์เบลล์ (Tinkerbell) รสทูน่า โซเดียมต่ำ",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ซอง",
    price: 5,
    sizeLabel: "ซอง",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["ทิงเกอร์เบลล์ (Tinkerbell) รสทูน่า โซเดียมต่ำ"]
  },
  {
    id: 2103,
    name: "ทิงเกอร์เบลล์ (Tinkerbell) รสเนื้อวัว โซเดียมต่ำ",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ซอง",
    price: 5,
    sizeLabel: "ซอง",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["ทิงเกอร์เบลล์ (Tinkerbell) รสเนื้อวัว โซเดียมต่ำ"]
  },
  {
    id: 2104,
    name: "ทิงเกอร์เบลล์ (Tinkerbell) รสเนื้อวัวผสมเนื้อแกะ โซเดียมต่ำ",
    category: "สินค้าสัตว์เลี้ยง",
    stock: 20,
    minStock: 5,
    unit: "ซอง",
    price: 5,
    sizeLabel: "ซอง",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["ทิงเกอร์เบลล์ (Tinkerbell) รสเนื้อวัวผสมเนื้อแกะ โซเดียมต่ำ"]
  }
];

const herbalDrinkProducts: Product[] = [
  "น้ำแตงโม",
  "น้ำเก๊กฮวย",
  "น้ำเฉาก๊วย",
  "น้ำตะไคร้ใบเตย",
  "น้ำทับทิม",
  "น้ำกระเจี๊ยบ",
  "น้ำข้าวโพด",
  "น้ำขิง",
  "น้ำถั่ว 5 สี",
  "น้ำเตยหอม",
  "น้ำใบบัวบก",
  "น้ำมะนาว",
  "น้ำมะพร้าว",
  "น้ำส้ม",
  "น้ำเสาวรส",
  "น้ำฟักทอง",
  "น้ำมะม่วงหาวมะนาวโห่",
  "น้ำองุ่น",
  "น้ำอัญชันมะนาว"
].map((name, index) => ({
  id: 4000 + index,
  name,
  category: "น้ำสมุนไพรโฮมเมด",
  stock: 20,
  minStock: 5,
  unit: "ขวด",
  price: 10,
  sizeLabel: "220ml",
  updatedBy: "เจ้าของร้าน",
  imageUrl: productImageByName[name]
}));

const thaiDessertProducts: Product[] = ["ขนมไทย ตะโก้กะทิ", "ขนมไทย บัวลอย"].map((name, index) => ({
  id: 5000 + index,
  name,
  category: "ขนมไทย",
  stock: 20,
  minStock: 5,
  unit: "กล่อง",
  price: 20,
  sizeLabel: "ขนาดเดียว",
  updatedBy: "เจ้าของร้าน",
  imageUrl: productImageByName[name]
}));

const beverageProducts: Product[] = [
  { name: "สิงห์โซดาวันเวย์", unit: "ขวด", price: 10 },
  { name: "สิงห์ เลมอน โซดา", unit: "กระป๋อง", price: 17 },
  { name: "สิงห์ เลมอน&บ๊วย โซดา", unit: "กระป๋อง", price: 17 },
  { name: "สิงห์ แดงเลมอน โซดา", unit: "กระป๋อง", price: 17 },
  { name: "สิงห์ พิงค์เลมอน โซดา", unit: "กระป๋อง", price: 17 },
  { name: "สิงห์ ยูซุเลมอน โซดา", unit: "กระป๋อง", price: 17 },
  { name: "สิงห์ เมล่อนเลมอน โซดา", unit: "กระป๋อง", price: 17 },
  { name: "สิงห์ เลมอนครีม โซดา", unit: "กระป๋อง", price: 17 },
  { name: "สไปรท์", unit: "ขวด", price: 0 },
  { name: "สไปรท์ กระป๋อง", unit: "กระป๋อง", price: 0 },
  { name: "สไปรท์ สูตรไม่มีน้ำตาล (ฝาดำ)", unit: "ขวด", price: 0, sizeLabel: "ฝาดำ ไม่มีน้ำตาล" },
  { name: "แฟนต้า น้ำแดง 15 บาท", unit: "ขวด", price: 15, sizeLabel: "ขวด 15 บาท" },
  { name: "แฟนต้า น้ำแดง 10 บาท", unit: "ขวด", price: 10, sizeLabel: "ขวด 10 บาท" },
  { name: "แฟนต้า น้ำแดงกระป๋อง", unit: "กระป๋อง", price: 0 },
  { name: "แฟนต้า น้ำแดงขวดลิตร", unit: "ขวด", price: 30, sizeLabel: "ขวดลิตร" },
  { name: "เป๊บซี่กระป๋อง", unit: "กระป๋อง", price: 0 },
  { name: "แฟนต้า น้ำเขียวขวดเล็ก", unit: "ขวด", price: 16, sizeLabel: "ขวดเล็ก" },
  { name: "แฟนต้า น้ำเขียวขวดลิตร", unit: "ขวด", price: 30, sizeLabel: "ขวดลิตร" },
  { name: "แฟนต้า น้ำเขียวกระป๋อง", unit: "กระป๋อง", price: 0 },
  { name: "แฟนต้า น้ำส้มกระป๋อง", unit: "กระป๋อง", price: 0 },
  { name: "แฟนต้า น้ำส้มขวดเล็ก", unit: "ขวด", price: 16, sizeLabel: "ขวดเล็ก" },
  { name: "น้ำทิพย์ขวดเล็ก", unit: "ขวด", price: 6, sizeLabel: "ขวดเล็ก" },
  { name: "น้ำทิพย์ขวดใหญ่", unit: "ขวด", price: 12, sizeLabel: "ขวดใหญ่" },
  { name: "น้ำวีด้าขวดเล็ก", unit: "ขวด", price: 6, sizeLabel: "ขวดเล็ก" },
  { name: "น้ำวีด้าขวดใหญ่", unit: "ขวด", price: 12, sizeLabel: "ขวดใหญ่" },
  { name: "น้ำคริสตัลขวดจิ๋ว", unit: "ขวด", price: 5, sizeLabel: "ขวดจิ๋ว" },
  { name: "น้ำดื่มยันฮี ฝาเหลือง", unit: "ขวด", price: 17, sizeLabel: "ฝาเหลือง" },
  { name: "น้ำดื่มยันฮี ฝาขาว", unit: "ขวด", price: 7, sizeLabel: "ฝาขาว" },
  { name: "น้ำดื่มคริสตัลขวดเล็ก", unit: "ขวด", price: 8, sizeLabel: "ขวดเล็ก" },
  { name: "น้ำดื่มคริสตัลขวดใหญ่", unit: "ขวด", price: 16, sizeLabel: "ขวดใหญ่" },
  { name: "น้ำจับใจ", unit: "ขวด", price: 10 },
  { name: "เย็นเย็น เก๊กฮวยน้ำผึ้ง", unit: "ขวด", price: 10 },
  { name: "เย็นเย็น จับเลี้ยง น้ำตาล 2%", unit: "ขวด", price: 10 },
  { name: "เย็นเย็น รสสละพุทราจีน", unit: "ขวด", price: 10 },
  { name: "อิชิตัน กรีนที รสน้ำผึ้งผสมมะนาว", unit: "ขวด", price: 10, sizeLabel: "ขวด 10 บาท" },
  { name: "อิชิตัน กรีนที รสต้นตำรับ", unit: "ขวด", price: 16 },
  { name: "โออิชิ กรีนทีชาเขียว รสต้นตำรับ", unit: "ขวด", price: 16 },
  { name: "โออิชิ กรีนที รสแตงโม", unit: "ขวด", price: 16 },
  { name: "อิชิตัน กรีนที รสจมูกข้าวญี่ปุ่น", unit: "ขวด", price: 16 },
  { name: "เนสกาแฟกระป๋องเขียว เอสเปรสโซ โรสต์", unit: "กระป๋อง", price: 17 },
  { name: "เนสกาแฟซองเขียว Blend & Brew 3 in 1", unit: "ซอง", price: 5 },
  { name: "เนสกาแฟซองแดง Blend & Brew Rich Aroma", unit: "ซอง", price: 5 },
  { name: "กาแฟเบอร์ดี้แดง โรบัสต้า กระป๋อง", unit: "กระป๋อง", price: 17 },
  { name: "กาแฟเบอร์ดี้ ลาเต้ สูตรน้ำตาลน้อย กระป๋อง", unit: "กระป๋อง", price: 0 },
  { name: "กาแฟเบอร์ดี้ เอสเปรสโซ สูตรน้ำตาลน้อย กระป๋อง", unit: "กระป๋อง", price: 0 },
  { name: "กาแฟเบอร์ดี้ แบล็ค สูตรน้ำตาลน้อย กระป๋อง", unit: "กระป๋อง", price: 0 },
  { name: "กาแฟเบอร์ดี้ แบล็ค ซีโร่ กระป๋อง", unit: "กระป๋อง", price: 0 },
  { name: "กาแฟเบอร์ดี้ โรบัสต้า ซีโร่ กระป๋อง", unit: "กระป๋อง", price: 0 },
  { name: "M150", unit: "ขวด", price: 12 },
  { name: "ลิโพ", unit: "ขวด", price: 12 },
  { name: "กระทิงแดง", unit: "ขวด", price: 12 },
  { name: "คาราบาว", unit: "ขวด", price: 10 },
  { name: "โสมเกาหลี", unit: "ขวด", price: 10 },
  { name: "แบรนด์ซุปไก่ ขวดใหญ่", unit: "ขวด", price: 60, sizeLabel: "ขวดใหญ่" },
  { name: "แบรนด์ซุปไก่ ขวดเล็ก", unit: "ขวด", price: 38, sizeLabel: "ขวดเล็ก" },
  { name: "แบรนด์วีด้า ขวดใหญ่", unit: "ขวด", price: 0, sizeLabel: "ขวดใหญ่" },
  { name: "แบรนด์วีด้า ขวดเล็ก", unit: "ขวด", price: 28, sizeLabel: "ขวดเล็ก" },
  { name: "แบรนด์รังนกแท้ คลาสสิค ผสมน้ำตาลกรวด ขวดเล็ก", unit: "ขวด", price: 0, sizeLabel: "ขวดเล็ก" },
  { name: "แบรนด์ซุปไก่สกัด สูตรต้นตำรับ 42 มล. ขวดเล็ก", unit: "ขวด", price: 0, sizeLabel: "ขวดเล็ก" },
  { name: "แบรนด์วีต้า พรุนสกัดเข้มข้นผสมวิตามิน ขวดเล็ก", unit: "ขวด", price: 0, sizeLabel: "ขวดเล็ก" },
  { name: "แบรนด์วีต้า ลูทีน แบล็คเคอร์แรนต์ ขวดเล็ก", unit: "ขวด", price: 0, sizeLabel: "ขวดเล็ก" },
  { name: "แบรนด์วีต้า วิตามินมิกซ์ ขวดเล็ก", unit: "ขวด", price: 0, sizeLabel: "ขวดเล็ก" },
  { name: "แบรนด์วีต้า วิตามิน A เบอร์รี่ ขวดเล็ก", unit: "ขวด", price: 0, sizeLabel: "ขวดเล็ก" },
  { name: "สปอนเซอร์", unit: "ขวด", price: 12 },
  { name: "มิรินด้าขวดเล็ก", unit: "ขวด", price: 10, sizeLabel: "ขวดเล็ก" },
  { name: "มิรินด้าขวดใหญ่", unit: "ขวด", price: 0, sizeLabel: "ขวดใหญ่" },
  { name: "โค้กขวดใหญ่", unit: "ขวด", price: 35, sizeLabel: "ขวดใหญ่" },
  { name: "โค้กขวดเล็ก", unit: "ขวด", price: 17, sizeLabel: "ขวดเล็ก" },
  { name: "โค้กกระป๋อง", unit: "กระป๋อง", price: 17 },
  { name: "เป๊บซี่ขวดใหญ่", unit: "ขวด", price: 35, sizeLabel: "ขวดใหญ่" },
  { name: "เป๊บซี่ขวด 10 บาท", unit: "ขวด", price: 10, sizeLabel: "ขวด 10 บาท" },
  { name: "เป๊บซี่ขวด 13 บาท", unit: "ขวด", price: 13, sizeLabel: "ขวด 13 บาท" },
  { name: "แฟนต้าสีส้มขวดใหญ่", unit: "ขวด", price: 30, sizeLabel: "ขวดใหญ่" },
  { name: "แฟนต้าสีเขียวไม่มีน้ำตาล", unit: "ขวด", price: 0, sizeLabel: "ไม่มีน้ำตาล" },
  { name: "แฟนต้าสีแดงไม่มีน้ำตาล", unit: "ขวด", price: 0, sizeLabel: "ไม่มีน้ำตาล" },
  { name: "แฟนต้าสีส้มไม่มีน้ำตาล", unit: "ขวด", price: 0, sizeLabel: "ไม่มีน้ำตาล" },
  { name: "เซเว่นอัป", unit: "ขวด", price: 10 },
  { name: "โค้กไม่มีน้ำตาล ขวดใหญ่", unit: "ขวด", price: 0, sizeLabel: "ขวดใหญ่ ไม่มีน้ำตาล" }
].map((product, index) => ({
  id: 6000 + index,
  category: "เครื่องดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)",
  stock: 20,
  minStock: 5,
  updatedBy: "เจ้าของร้าน",
  imageUrl: productImageByName[product.name],
  ...product
}));

const beverageProductNames = new Set(beverageProducts.map((product) => product.name));

const milkProducts: Product[] = [
  { name: "นมไวตามินขวด", unit: "ขวด", price: 17 }
].map((product, index) => ({
  id: 9500 + index,
  category: "นม/โยเกิร์ต",
  stock: 20,
  minStock: 5,
  updatedBy: "เจ้าของร้าน",
  imageUrl: productImageByName[product.name],
  ...product
}));

const bulkPackProducts: Product[] = [
  { name: "น้ำวีด้าขวดเล็กยกแพ็ก", unit: "แพ็ก", sizeLabel: "ขวดเล็ก" },
  { name: "น้ำทิพย์ขวดเล็กยกแพ็ก", unit: "แพ็ก", sizeLabel: "ขวดเล็ก" },
  { name: "น้ำทิพย์ขวดใหญ่ยกแพ็ก", unit: "แพ็ก", sizeLabel: "ขวดใหญ่" },
  { name: "น้ำคริสตัลจิ๋วยกแพ็ก", unit: "แพ็ก", sizeLabel: "ขวดจิ๋ว" },
  { name: "น้ำคริสตัลขวดใหญ่ยกแพ็ก", unit: "แพ็ก", sizeLabel: "ขวดใหญ่" },
  { name: "น้ำคริสตัลขวดเล็กยกแพ็ก", unit: "แพ็ก", sizeLabel: "ขวดเล็ก" }
].map((product, index) => ({
  id: 9000 + index,
  category: "สินค้าขายยกแพ็ก",
  stock: 20,
  minStock: 5,
  price: 0,
  updatedBy: "เจ้าของร้าน",
  imageUrl: productImageByName[product.name],
  ...product
}));

const seasoningProducts: Product[] = [
  {
    id: 8006,
    name: "ซีอิ๊วขาว ตราเด็กสมบูรณ์ 150 มล.",
    category: "เครื่องปรุง",
    stock: 20,
    minStock: 5,
    unit: "ขวด",
    sizeLabel: "150 มล.",
    price: 0,
    updatedBy: "เจ้าของร้าน",
    imageUrl: "/product-images/seasoning/dek-somboon-light-soy-sauce-150ml.png"
  },
  {
    id: 8000,
    name: "น้ำตาลทรายขาวมิตรผล 1 กิโลกรัม",
    category: "เครื่องปรุง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 29,
    sizeLabel: "1 กิโลกรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["น้ำตาลทรายขาวมิตรผล 1 กิโลกรัม"]
  },
  {
    id: 8001,
    name: "น้ำตาลทรายแดงมิตรผล 1 กิโลกรัม",
    category: "เครื่องปรุง",
    stock: 20,
    minStock: 5,
    unit: "ถุง",
    price: 0,
    sizeLabel: "1 กิโลกรัม",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["น้ำตาลทรายแดงมิตรผล 1 กิโลกรัม"]
  },
  {
    id: 8002,
    name: "น้ำปลาแท้ตราทิพรส ขวดเล็ก",
    category: "เครื่องปรุง",
    stock: 20,
    minStock: 5,
    unit: "ขวด",
    price: 0,
    sizeLabel: "ขวดเล็ก",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["น้ำปลาแท้ตราทิพรส ขวดเล็ก"]
  },
  {
    id: 8003,
    name: "น้ำปลาแท้ตราทิพรส ขวดเล็ก ทรงสูง",
    category: "เครื่องปรุง",
    stock: 20,
    minStock: 5,
    unit: "ขวด",
    price: 0,
    sizeLabel: "ขวดเล็ก ทรงสูง",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["น้ำปลาแท้ตราทิพรส ขวดเล็ก ทรงสูง"]
  },
  {
    id: 8004,
    name: "น้ำปลาร้าแซ่บไมค์",
    category: "เครื่องปรุง",
    stock: 20,
    minStock: 5,
    unit: "ขวด",
    price: 0,
    sizeLabel: "350ml",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["น้ำปลาร้าแซ่บไมค์"]
  },
  {
    id: 8005,
    name: "กะทิชาวเกาะ 500ml",
    category: "เครื่องปรุง",
    stock: 20,
    minStock: 5,
    unit: "กล่อง",
    price: 0,
    sizeLabel: "500ml",
    updatedBy: "เจ้าของร้าน",
    imageUrl: productImageByName["กะทิชาวเกาะ 500ml"]
  }
];

const alcoholProducts: Product[] = [
  { name: "สิงห์ขวด", unit: "ขวด", price: 65 },
  { name: "สิงห์กระป๋องยาว", unit: "กระป๋อง", price: 55, sizeLabel: "กระป๋องยาว" },
  { name: "สิงห์กระป๋องสั้น", unit: "กระป๋อง", price: 0, sizeLabel: "กระป๋องสั้น" },
  { name: "ลีโอขวด", unit: "ขวด", price: 62 },
  { name: "ลีโอกระป๋องยาว", unit: "กระป๋อง", price: 54, sizeLabel: "กระป๋องยาว" },
  { name: "ลีโอกระป๋องสั้น", unit: "กระป๋อง", price: 0, sizeLabel: "กระป๋องสั้น" },
  { name: "ช้างขวด", unit: "ขวด", price: 60 },
  { name: "ช้างกระป๋องยาว", unit: "กระป๋อง", price: 54, sizeLabel: "กระป๋องยาว" },
  { name: "ช้างกระป๋องสั้น", unit: "กระป๋อง", price: 0, sizeLabel: "กระป๋องสั้น" },
  { name: "หงส์ทองกลม", unit: "ขวด", price: 270, sizeLabel: "ขวดกลม" },
  { name: "หงส์ทองแบน", unit: "ขวด", price: 150, sizeLabel: "ขวดแบน" },
  { name: "เสือดำเล็ก", unit: "ขวด", price: 85, sizeLabel: "ขวดเล็ก" },
  { name: "เสือดำขวดแบน", unit: "ขวด", price: 55, sizeLabel: "ขวดแบน" },
  { name: "เหล้าขาว", unit: "ขวด", price: 70 },
  { name: "รีเจนซี่กลม", unit: "ขวด", price: 0, sizeLabel: "ขวดกลม" },
  { name: "รีเจนซี่แบน", unit: "ขวด", price: 0, sizeLabel: "ขวดแบน" },
  { name: "ฟลูมูน Full Moon", unit: "ขวด", price: 25 },
  { name: "สปาย Classic", unit: "ขวด", price: 0 },
  { name: "สปาย Butterfly Kiss", unit: "ขวด", price: 0 },
  { name: "สปาย High Strawberry Daiquiri", unit: "ขวด", price: 0 },
  { name: "สปาย Black", unit: "ขวด", price: 0 },
  { name: "สปาย Red", unit: "ขวด", price: 35 },
  { name: "สปาย Moscato Gold", unit: "ขวด", price: 0 },
  { name: "สปาย Sparkling Gold", unit: "ขวด", price: 0 },
  { name: "สปาย Melon Sparkle", unit: "ขวด", price: 0 },
  { name: "สปาย Angel Kiss", unit: "ขวด", price: 0 },
  { name: "สปาย White", unit: "ขวด", price: 0 },
  { name: "สปาย Blue", unit: "ขวด", price: 0 },
  { name: "สปาย Kamikaze", unit: "ขวด", price: 0 },
  { name: "สปาย Candy Kiss", unit: "ขวด", price: 0 },
  { name: "สปาย Lollipop Kiss", unit: "ขวด", price: 0 },
  { name: "สปาย High Lime", unit: "ขวด", price: 0 },
  { name: "นิยมไทยขวดเล็ก", unit: "ขวด", price: 0, sizeLabel: "ขวดเล็ก" },
  { name: "สุรานิยมไทยขวดใหญ่", unit: "ขวด", price: 0, sizeLabel: "ขวดใหญ่" },
  { name: "285 กลม", unit: "ขวด", price: 0, sizeLabel: "ขวดกลม" }
].map((product, index) => ({
  id: 7000 + index,
  name: product.name,
  category: "เครื่องดื่มแอลกอฮอล์",
  stock: productStockByName[product.name] ?? 20,
  minStock: 5,
  unit: product.unit,
  price: product.price,
  sizeLabel: product.sizeLabel,
  updatedBy: "เจ้าของร้าน",
  imageUrl: productImageByName[product.name]
}));

const alcoholProductNames = new Set([
  "เบียร์กระป๋อง",
  ...alcoholProducts.map((product) => product.name)
]);

const instantNoodleProducts: Product[] = [
  { name: "มาม่า รสต้มยำกุ้งน้ำข้น", unit: "ซอง" },
  { name: "มาม่า รสเย็นตาโฟต้มยำหม้อไฟ", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "มาม่า รสหมูสับ", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "มาม่า เส้นหมี่ต้มยำกุ้ง", unit: "ซอง", sizeLabel: "55 กรัม" },
  { name: "มาม่า รสเป็ดพะโล้", unit: "ซอง", sizeLabel: "55 กรัม" },
  { name: "ไวไว ปรุงสำเร็จ", unit: "ซอง" },
  { name: "ไวไว รสหมูสับ", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "ไวไว รสหมูสับต้มยำ", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "ไวไว รสหอยลายผัดฉ่า แห้ง", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "ไวไว เส้นหมี่ปรุงรส", unit: "ซอง", sizeLabel: "55 กรัม" },
  { name: "ยำยำ คัพ รสต้มยำกุ้ง", unit: "ถ้วย", sizeLabel: "คัพ" },
  { name: "ยำยำ คัพ รสหมี่กี้ทะเล", unit: "ถ้วย", sizeLabel: "คัพ" },
  { name: "ยำยำ บิ๊กคัพ รสต้มยำกุ้งน้ำข้น", unit: "ถ้วย", sizeLabel: "บิ๊กคัพ" },
  { name: "ยำยำ สูตรเด็ด รสสไปซี่ล็อบสเตอร์", unit: "ถ้วย", sizeLabel: "คัพ" },
  { name: "ยำยำ สูตรเด็ด รสหมูสับโคชูจัง", unit: "ถ้วย", sizeLabel: "คัพ" },
  // ยำยำ ช้างน้อย ซองเล็ก 20 กรัม
  { name: "ยำยำ ช้างน้อย รสซุปเปอร์เลมอน", unit: "ซอง", sizeLabel: "20 กรัม" },
  { name: "ยำยำ ช้างน้อย รสบาร์บีคิว", unit: "ซอง", sizeLabel: "20 กรัม" },
  { name: "ยำยำ ช้างน้อย รสข้าวโพด", unit: "ซอง", sizeLabel: "20 กรัม" },
  { name: "ยำยำ ช้างน้อย รสต้มยำกุ้ง", unit: "ซอง", sizeLabel: "20 กรัม" },
  { name: "ควิกแซ่บ คัพ รสต้มยำกุ้ง", unit: "ถ้วย", sizeLabel: "คัพ" },
  { name: "ควิกแซ่บ คัพ รสต้มยำพริกเผา", unit: "ถ้วย", sizeLabel: "คัพ" },
  { name: "ควิกแซ่บ คัพ รสต้มโคล้ง", unit: "ถ้วย", sizeLabel: "คัพ" },
  { name: "ควิกแซ่บ คัพ รสต้มยำมันกุ้ง", unit: "ถ้วย", sizeLabel: "คัพ" },
  { name: "ควิกแซ่บ คัพ รสกุ้งนึ่งมะนาว", unit: "ถ้วย", sizeLabel: "คัพ" },
  { name: "ควิกแซ่บ รสต้มยำกุ้ง", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "ควิกแซ่บ รสต้มโคล้ง", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "ควิกแซ่บ รสกุ้งนึ่งมะนาว", unit: "ซอง", sizeLabel: "55 กรัม" },
  { name: "ควิกแซ่บ รสต้มยำมันกุ้ง", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "นิสชิน รสไก่เผ็ดเกาหลีคาโบนาร่า (แบบแห้ง)", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "นิสชิน รสทงคตสึ", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "นิสชิน รสไก่เผ็ดเกาหลีชีส (แบบแห้ง)", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "นิสชิน รสฮอตชิลลี่ล็อบสเตอร์ (แบบแห้ง)", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "นิสชิน รสหมูสับ", unit: "ซอง", sizeLabel: "60 กรัม" },
  { name: "นิสชิน คัพ รสไก่เผ็ดเกาหลีชีส (แบบแห้ง)", unit: "ถ้วย", sizeLabel: "คัพ" },
  { name: "นิสชิน คัพ รสสไปซี่ (แบบแห้ง)", unit: "ถ้วย", sizeLabel: "คัพ" },
  { name: "นิสชิน คัพ รสสาหร่าย", unit: "ถ้วย", sizeLabel: "คัพ" },
  { name: "นิสชิน คัพ รสไก่ข้าวโพด", unit: "ถ้วย", sizeLabel: "คัพ" },
  { name: "นิสชิน คัพ รสไก่เห็ดหอม", unit: "ถ้วย", sizeLabel: "คัพ" }
].map((product, index) => ({
  id: 10000 + index,
  category: "บะหมี่กึ่งสำเร็จรูป",
  stock: 20,
  minStock: 5,
  price: 0,
  updatedBy: "เจ้าของร้าน",
  imageUrl: productImageByName[product.name],
  ...product
}));

const personalCareProducts: Product[] = [
  { name: "โซฟี แบบกระชับ 29 ซม.", unit: "แพ็ก", sizeLabel: "29 ซม. 6 ชิ้น" },
  { name: "โซฟี Cooling Fresh มีปีก 23 ซม.", unit: "แพ็ก", sizeLabel: "23 ซม. 8 ชิ้น" },
  { name: "โซฟี Charcoal Fresh กลางคืน 29 ซม.", unit: "แพ็ก", sizeLabel: "29 ซม. 14 ชิ้น" },
  { name: "โซฟี หลับสนิทตลอดคืน 29 ซม.", unit: "แพ็ก", sizeLabel: "29 ซม. 12 ชิ้น" },
  { name: "ลอรีเอะ Soft & Safe สลิม กลางวัน มีปีก", unit: "แพ็ก", sizeLabel: "4 ชิ้น" },
  { name: "เอลิส Fairy Wings 30 ซม. กลางวัน-กลางคืน", unit: "แพ็ก", sizeLabel: "30 ซม. 12 ชิ้น" },
  { name: "เอลิส Fairy Wings 22.5 ซม. กลางวัน มีปีก", unit: "แพ็ก", sizeLabel: "22.5 ซม. 16 ชิ้น" },
  { name: "เอลิส Fairy Wings 25 ซม. กลางวัน มีปีก", unit: "แพ็ก", sizeLabel: "25 ซม. 14 ชิ้น" },
  { name: "เอลิส Fairy Wings 35 ซม. กลางคืน", unit: "แพ็ก", sizeLabel: "35 ซม. 10 ชิ้น" },
  { name: "เอลิส Fairy Wings 42 ซม. กลางคืน", unit: "แพ็ก", sizeLabel: "42 ซม. 6 ชิ้น" }
].map((product, index) => ({
  id: 11000 + index,
  category: "ของใช้ส่วนตัว",
  stock: 20,
  minStock: 5,
  price: 0,
  updatedBy: "เจ้าของร้าน",
  imageUrl: productImageByName[product.name],
  ...product
}));

const snackProducts: Product[] = (
  [
    { name: "เจ็ดซ์ รสซอสมะเขือเทศ", sizeLabel: "12 กรัม" },
    { name: "เจ็ดซ์ รสซอสพริก", sizeLabel: "12 กรัม" },
    { name: "ปูไทย รสปลาหมึก" },
    { name: "แคมปัส รสช็อกโกแลต", sizeLabel: "30 กรัม" },
    { name: "ทวิสโก้ รสบาร์บีคิว" },
    // ตะวัน ซองเล็ก 5 บาท
    { name: "ตะวัน รสกุ้งกรอบ", sizeLabel: "ซองเล็ก 16 กรัม" },
    { name: "ตะวัน รสหมึกสามรส", sizeLabel: "ซองเล็ก 16 กรัม" },
    { name: "ตะวัน รสลาบแซ่บ", sizeLabel: "ซองเล็ก 16 กรัม" },
    { name: "ตะวัน รสสาหร่ายทรงเครื่อง", sizeLabel: "ซองเล็ก" },
    { name: "ตะวัน รสต้นตำรับ", sizeLabel: "ซองเล็ก" },
    // ตะวัน ซองใหญ่ 20 บาท
    { name: "ตะวัน รสกุ้งกรอบ", price: 20, sizeLabel: "ซองใหญ่ 67 กรัม" },
    { name: "ตะวัน รสสาหร่ายทรงเครื่อง", price: 20, sizeLabel: "ซองใหญ่ 67 กรัม" },
    { name: "ตะวัน รสลาบแซ่บ", price: 20, sizeLabel: "ซองใหญ่ 67 กรัม" },
    { name: "ตะวัน รสต้นตำรับ", price: 20, sizeLabel: "ซองใหญ่" },
    { name: "ตะวัน จัมโบ้แพ็ค รสหมึกสามรส", price: 20, sizeLabel: "จัมโบ้แพ็ค 96 กรัม" },
    { name: "ตะวัน รสไก่วิงค์ซี๊ด", price: 20, sizeLabel: "ซองใหญ่ 67 กรัม" },
    // PR Big Bag ซองใหญ่ 20 บาท
    { name: "PR Big Bag รสสาหร่าย", price: 20, sizeLabel: "80 กรัม" },
    { name: "PR Big Bag รสมะเขือเทศ", price: 20, sizeLabel: "80 กรัม" },
    { name: "PR Big Bag รสกุ้งสไปซี่", price: 20, sizeLabel: "80 กรัม" }
  ] as { name: string; price?: number; sizeLabel?: string; unit?: string }[]
).map((product, index) => ({
  id: 12000 + index,
  category: "ขนมและของกินเล่น",
  stock: 20,
  minStock: 5,
  unit: "ซอง",
  price: 5,
  updatedBy: "เจ้าของร้าน",
  imageUrl: productImageByName[product.name],
  ...product
}));

const chocolateProducts: Product[] = [
  { name: "ทิวลี่ ทวิน จัมโบ้", sizeLabel: "ซองแดง (ช็อกโกแลต)" },
  { name: "ทิวลี่ ทวิน จัมโบ้", sizeLabel: "ซองน้ำเงิน (นม)" },
  { name: "มอลกิสต์ รสช็อกโกแลต", sizeLabel: "42 กรัม" },
  { name: "คริโก้ เวเฟอร์รสช็อกโกแลต" },
  { name: "ทิวลี่ คลาสสิก", sizeLabel: "ซองแดง" },
  { name: "ทิวลี่ คลาสสิก", sizeLabel: "ซองน้ำเงิน" },
  { name: "ทิวลี่ Select อัลมอนด์และช็อกโกแลต" },
  { name: "ทิวลี่ Big Bang ช็อกโกแลตคาราเมลข้าวพอง" },
  { name: "เบ้งเบ้ง (beng-beng)" },
  { name: "ทิวลี่ โอวัลติน ช็อกมอลต์และเฟลค" }
].map((product, index) => ({
  id: 13000 + index,
  category: "ช็อกโกแลต",
  stock: 20,
  minStock: 5,
  unit: "ซอง",
  price: 5,
  updatedBy: "เจ้าของร้าน",
  imageUrl: productImageByName[product.name],
  ...product
}));

const medicineProducts: Product[] = [
  { name: "ยาดมแบบขวด ขวดแดง", unit: "ขวด" },
  { name: "ยาดมตราเสือ (Tiger Balm Inhaler)" },
  { name: "ยาดมโป๊ยเซียน มาร์คทู", sizeLabel: "คละสี" },
  { name: "ยาดมเป๊ปเปอร์มินท์ฟิลด์", sizeLabel: "คละสี" },
  { name: "ยาดมตราถ้วยทอง กลิ่นเลมอน" },
  // ยาดมสมุนไพรแบบกระปุก
  { name: "ยาดมสมุนไพร ตราหงส์ไทย", unit: "กระปุก", sizeLabel: "สีเหลือง" },
  { name: "ยาดมสมุนไพร ตราหงส์ไทย", unit: "กระปุก", sizeLabel: "สีเขียว" },
  { name: "ยาดมสมุนไพร ตราวังว่าน", unit: "กระปุก" },
  { name: "ยาดมสมุนไพร ตรามังกรทอง", unit: "กระปุก" },
  // พิมเสนน้ำ ตราโป๊ยเซียน
  { name: "พิมเสนน้ำ ตราโป๊ยเซียน", unit: "หลอด", sizeLabel: "แบบโรลออน" },
  { name: "พิมเสนน้ำ ตราโป๊ยเซียน", unit: "ขวด", sizeLabel: "แบบขวด" },
  { name: "พิมเสนน้ำ ตราโป๊ยเซียน", unit: "กระปุก", sizeLabel: "แบบตลับ" },
  // ยาหม่อง
  { name: "ยาหม่องตราถ้วยทอง 2493", unit: "กระปุก" },
  { name: "ยาหม่องตราเสือ (Tiger Balm HR)", unit: "กระปุก" },
  { name: "น้ำมันโอสถทิพย์", unit: "กระปุก", sizeLabel: "สีเขียว" },
  { name: "ยาหม่องตราวังว่าน", unit: "กระปุก", sizeLabel: "100 กรัม" },
  { name: "ยาหม่องโอสถ ตรารำม้า", unit: "กระปุก", sizeLabel: "200 กรัม" },
  { name: "ยาหม่องตราถ้วยทอง 2493", unit: "ตลับ", sizeLabel: "ตลับเล็ก 8 กรัม" },
  { name: "ยาหม่องสำเภาทอง สูตรไพล", unit: "กระปุก" },
  { name: "ยาหม่องเสลดพังพอน ตราหมอเอี้ยง", unit: "กระปุก" },
  { name: "ยาหม่องไพล (Compound Phlai Balm)", unit: "กระปุก" },
  { name: "วิกส์ วาโปรับ (Vicks VapoRub)", unit: "ตลับ" },
  { name: "ยาน้ำสเปรย์ ตรานำมวย", unit: "ขวด", sizeLabel: "สเปรย์ 40 มล." },
  { name: "น้ำมันมวย ตรานำมวย", unit: "ขวด" },
  // ผิวหนัง / แมลงกัดต่อย — sizeLabel ใช้กำกับว่ายาช่วยเรื่องอะไร
  { name: "ยาทาเสลดพังพอน ชนิดตลับ", unit: "ตลับ", sizeLabel: "แก้แมลงกัดต่อย" },
  { name: "คาดรามีน-วี โลชั่น (Cadramine-V Lotion)", unit: "ขวด", sizeLabel: "แก้ผดผื่นคัน · 60 มล." },
  { name: "คาลาไมน์ โลชั่น (Calamine Lotion)", unit: "ขวด", sizeLabel: "แก้ผดผื่นคัน" },
  { name: "คาลาไมน์พญายอ", unit: "ขวด", sizeLabel: "แก้ผดผื่นคัน แมลงกัด" },
  { name: "คาเนสเทน ยาครีมฆ่าเชื้อรา (Canesten)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา · 10 กรัม" },
  { name: "ดาเนสเทน ยาครีมฆ่าเชื้อรา (Danesten)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา · 10 กรัม" },
  { name: "ไลมาริน ครีม (Lymarin Cream)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา/แบคทีเรีย · 15 กรัม" },
  { name: "คีล่า โลชั่น (Kela Lotion)", unit: "ขวด", sizeLabel: "แก้ผื่นแพ้ผิวหนัง" },
  { name: "เบต้า-ไดโป ครีม (Beta-Dipo Cream)", unit: "หลอด", sizeLabel: "แก้ผื่นแพ้อักเสบ · 10 กรัม" },
  { name: "ฟังจิเดอร์ม-บี ครีม (Fungiderm-B Cream)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา · 20 กรัม" },
  { name: "ซีมา ครีม รักษาฮ่องกงฟุต (Zema Cream)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา (ฮ่องกงฟุต) · 10 กรัม" },
  { name: "โทนาฟ ครีม (TONAF Cream)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา · 5 กรัม" },
  { name: "ไมโครัล ครีม (Micoral Cream)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา" },
  { name: "ยาครีมโคลไทรมาโซล 1% (Clotrimazole)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา · 15 กรัม" },
  { name: "แฟงโก้-บี ครีม (Fango-B Cream)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา · 15 กรัม" },
  { name: "เบตาดีน น้ำยาใส่แผล (Betadine Antiseptic)", unit: "ขวด", sizeLabel: "ฆ่าเชื้อ ใส่แผล" },
  { name: "เดอร์มาติกซ์ อัลตร้า (Dermatix Ultra)", unit: "หลอด", sizeLabel: "เจลลดรอยแผลเป็น" },
  // ยาสมุนไพร / บรรเทาอาการ
  { name: "ฟ้าทะลายโจร แคปซูล (Phyto Care)", unit: "กล่อง", sizeLabel: "บรรเทาเจ็บคอ · 100 แคปซูล" },
  { name: "ฟ้าทะลายโจร แคปซูล ตราอภัยภูเบศร", unit: "กล่อง", sizeLabel: "แก้ไข้" },
  { name: "ยากษัยเส้น ตราเด็กในพานทอง", unit: "กล่อง", sizeLabel: "แก้ปวดเมื่อย/ยาระบาย · 10 แคปซูล" },
  { name: "ยากษัยเส้น ตราเด็กในพานทอง", unit: "ซอง", sizeLabel: "แก้ปวดเมื่อย/ยาระบาย · ซอง" },
  { name: "ยาแก้ตัวร้อน ตราเขากวาง", unit: "ขวด", sizeLabel: "ลดไข้ตัวร้อน" },
  { name: "ยาน้ำเขากุ้ย (Kao-Kui Water)", unit: "ขวด", sizeLabel: "แก้ไข้ ร้อนใน กระหายน้ำ" },
  { name: "ยาหอม ตรา 5 เจดีย์", unit: "ซอง", sizeLabel: "แก้วิงเวียน บำรุงหัวใจ" },
  { name: "ยาหอมเบอร์ 33 ตราห้าม้า", unit: "ขวด", sizeLabel: "บำรุงหัวใจ แก้วิงเวียน" },
  { name: "ขมิ้นชัน แคปซูล ตราอภัยภูเบศร", unit: "กระปุก", sizeLabel: "บรรเทาท้องอืด" }
].map((product, index) => ({
  id: 14000 + index,
  category: "ยาสามัญประจำบ้าน",
  stock: 20,
  minStock: 5,
  unit: "หลอด",
  price: 0,
  updatedBy: "เจ้าของร้าน",
  imageUrl: productImageByName[product.name],
  ...product
}));

const firstAidProducts: Product[] = [
  { name: "สำลีก้อน", unit: "ถุง", sizeLabel: "ใช้ทำความสะอาดแผล" },
  { name: "คอตตอนบัด ตราไวท์แรบบิท", unit: "ถุง", sizeLabel: "ก้านสำลี 100 ก้าน" },
  { name: "สำลีก้าน ตรารถพยาบาล", unit: "ถุง", sizeLabel: "ก้านสำลี 200 ก้าน x3" }
].map((product, index) => ({
  id: 15000 + index,
  category: "ปฐมพยาบาล",
  stock: 20,
  minStock: 5,
  price: 0,
  updatedBy: "เจ้าของร้าน",
  imageUrl: productImageByName[product.name],
  ...product
}));

const initialProducts: Product[] = [
  { id: 1, name: "ลูกอมรสนม", category: "ลูกอมและหมากฝรั่ง", stock: 48, minStock: 12, unit: "ซอง", price: 5, updatedBy: "พนักงานขาย" },
  { id: 2, name: "เยลลี่ผลไม้รวม", category: "ขนมและของกินเล่น", stock: 9, minStock: 10, unit: "ถุง", price: 10, updatedBy: "เจ้าของร้าน" },
  { id: 3, name: "ขนมห่อเล็ก รสบาร์บีคิว", category: "ขนมและของกินเล่น", stock: 0, minStock: 15, unit: "ห่อ", price: 6, updatedBy: "พนักงานขาย" },
  { id: 5, name: "เบียร์กระป๋อง", category: "เครื่องดื่มแอลกอฮอล์", stock: 18, minStock: 12, unit: "กระป๋อง", price: 42, updatedBy: "เจ้าของร้าน" },
  { id: 7, name: "ยาดมสมุนไพร", category: "ยาสามัญประจำบ้าน", stock: 26, minStock: 10, unit: "ชิ้น", price: 20, updatedBy: "เจ้าของร้าน" },
  { id: 8, name: "ไฟแช็คคละสี", category: "ของใช้ในบ้าน", stock: 4, minStock: 8, unit: "ชิ้น", price: 10, updatedBy: "พนักงานขาย", imageUrl: "/product-images/lighter-mixed-color.png" },
  { id: 9, name: "น้ำยาล้างจาน", category: "ของใช้ในบ้าน", stock: 16, minStock: 6, unit: "ขวด", price: 35, updatedBy: "เจ้าของร้าน" },
  { id: 10, name: "ตะหลิวสแตนเลส", category: "ของใช้ในบ้าน", stock: 5, minStock: 4, unit: "อัน", price: 49, updatedBy: "พนักงานขาย" },
  { id: 11, name: "น้ำปลาแท้", category: "เครื่องปรุง", stock: 13, minStock: 8, unit: "ขวด", price: 28, updatedBy: "เจ้าของร้าน" },
  { id: 12, name: "รถของเล่นจิ๋ว", category: "แฟชั่น/ไลฟสไตล์", stock: 11, minStock: 8, unit: "ชิ้น", price: 15, updatedBy: "พนักงานขาย" },
  { id: 13, name: "ปากกาลูกลื่น", category: "อุปกรณ์เครื่องเขียน/สำนักงาน", stock: 35, minStock: 12, unit: "ด้าม", price: 7, updatedBy: "เจ้าของร้าน" },
  { id: 14, name: "แชมพูถุงเติม", category: "สุขภาพ/สวย", stock: 6, minStock: 10, unit: "ถุง", price: 39, updatedBy: "พนักงานขาย" },
  { id: 15, name: "แปรงสีฟันนุ่ม", category: "สุขภาพ/สวย", stock: 23, minStock: 8, unit: "ด้าม", price: 18, updatedBy: "เจ้าของร้าน" },
  { id: 16, name: "SMS แดง", category: "บุหรี่/ยาสูบ", stock: 12, minStock: 5, unit: "ซอง", price: 70, updatedBy: "เจ้าของร้าน" },
  { id: 17, name: "SMS เขียว", category: "บุหรี่/ยาสูบ", stock: 10, minStock: 5, unit: "ซอง", price: 70, updatedBy: "เจ้าของร้าน" },
  { id: 18, name: "LM แดง", category: "บุหรี่/ยาสูบ", stock: 9, minStock: 5, unit: "ซอง", price: 72, updatedBy: "เจ้าของร้าน" },
  { id: 19, name: "LM เขียว", category: "บุหรี่/ยาสูบ", stock: 8, minStock: 5, unit: "ซอง", price: 72, updatedBy: "เจ้าของร้าน" },
  { id: 20, name: "ยาสูบตราสมอ", category: "บุหรี่/ยาสูบ", stock: 14, minStock: 6, unit: "ซอง", price: 25, updatedBy: "เจ้าของร้าน" },
  {
    id: 21,
    name: "ยาสูบตราแมวเขียว",
    category: "บุหรี่/ยาสูบ",
    stock: 11,
    minStock: 6,
    unit: "ซอง",
    price: 20,
    updatedBy: "เจ้าของร้าน",
    imageUrl: greenCatTobaccoImage
  },
  {
    id: 22,
    name: "กระดาษแข็งตราสมอ",
    category: "บุหรี่/ยาสูบ",
    stock: 20,
    minStock: 6,
    unit: "ซอง",
    price: 2,
    updatedBy: "เจ้าของร้าน",
    imageUrl: anchorRollingPaperHardImage
  },
  { id: 23, name: "กระดาษอ่อนตราไก่", category: "บุหรี่/ยาสูบ", stock: 20, minStock: 6, unit: "ซอง", price: 10, updatedBy: "เจ้าของร้าน" },
  { id: 3000, name: "น้ำแข็งก้อน", category: "น้ำแข็ง", stock: 20, minStock: 5, unit: "ถุง", price: 10, updatedBy: "เจ้าของร้าน" },
  { id: 3001, name: "น้ำแข็งป่น", category: "น้ำแข็ง", stock: 20, minStock: 5, unit: "ถุง", price: 10, updatedBy: "เจ้าของร้าน" },
  { id: 3002, name: "น้ำแข็งก้อนเล็ก", category: "น้ำแข็ง", stock: 20, minStock: 5, unit: "ถุง", price: 10, updatedBy: "เจ้าของร้าน" },
  { id: 3006, name: "น้ำแข็งหลอดใหญ่", category: "น้ำแข็ง", stock: 20, minStock: 5, unit: "ถุง", price: 0, updatedBy: "เจ้าของร้าน", imageUrl: "/product-images/ice/ice-tube-large.png" },
  { id: 3007, name: "น้ำแข็งหลอดเล็ก", category: "น้ำแข็ง", stock: 20, minStock: 5, unit: "ถุง", price: 0, updatedBy: "เจ้าของร้าน", imageUrl: "/product-images/ice/ice-tube-small.png" },
  { id: 3004, name: "น้ำแข็ง 10 บาท", category: "น้ำแข็ง", stock: 20, minStock: 5, unit: "ถุง", price: 10, sizeLabel: "ถุง 10 บาท", updatedBy: "เจ้าของร้าน" },
  { id: 3005, name: "น้ำแข็ง 20 บาท", category: "น้ำแข็ง", stock: 20, minStock: 5, unit: "ถุง", price: 20, sizeLabel: "ถุง 20 บาท", updatedBy: "เจ้าของร้าน" },
  ...seasoningProducts,
  ...instantNoodleProducts,
  ...personalCareProducts,
  ...snackProducts,
  ...chocolateProducts,
  ...medicineProducts,
  ...firstAidProducts,
  ...beverageProducts,
  ...milkProducts,
  ...bulkPackProducts,
  ...herbalDrinkProducts,
  ...thaiDessertProducts,
  ...alcoholProducts,
  ...petProducts,
  ...layProducts
];

const defaultCategories = [
  "อุปกรณ์เครื่องเขียน/สำนักงาน",
  "ยาสามัญประจำบ้าน",
  "ปฐมพยาบาล",
  "สุขภาพ/สวย",
  "อาหารเสริม/เวชสำอาง",
  "ขนมและของกินเล่น",
  "สินค้าใหม่แกะกล่อง",
  "เนื้อสัตว์",
  "ไข่",
  "ผลไม้",
  "แซนวิช/ขนมปัง",
  "เลย์",
  "เครื่องดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)",
  "นม/โยเกิร์ต",
  "น้ำสมุนไพรโฮมเมด",
  "เบเกอรี่",
  "สินค้าสัตว์เลี้ยง",
  "แฟชั่น/ไลฟสไตล์",
  "อาหารแห้ง",
  "ไอทีและมือถือ",
  "บะหมี่กึ่งสำเร็จรูป",
  "ของสด",
  "ลูกอมและหมากฝรั่ง",
  "เครื่องปรุง",
  "ขนมไทย",
  "ของใช้ในบ้าน",
  "ของใช้ส่วนตัว",
  "ของเล่น",
  "กิ๊ฟช็อป",
  "เครื่องดื่มแอลกอฮอล์",
  "บุหรี่/ยาสูบ",
  "อาหารกระป๋อง",
  "ช็อกโกแลต",
  "บรรจุภัณฑ์และอุปกรณ์แพ็กอาหาร",
  "น้ำแข็ง",
  "ของแช่เย็น",
  "สินค้าขายยกแพ็ก"
];

const categoryBannerImages: Record<string, string> = {
  เลย์: "/category-banners/lay-banner.png",
  "อุปกรณ์เครื่องเขียน/สำนักงาน": "/category-banners/stationery-office-banner.png",
  ยาสามัญประจำบ้าน: "/category-banners/medicine-banner.png",
  "สุขภาพ/สวย": "/category-banners/health-beauty-banner.png",
  "อาหารเสริม/เวชสำอาง": "/category-banners/supplement-cosmeceutical-banner.png",
  ขนมและของกินเล่น: "/category-banners/snacks-banner.png",
  สินค้าใหม่แกะกล่อง: "/category-banners/new-arrivals-banner.png",
  ผลไม้: "/category-banners/fruit-banner.png",
  เนื้อสัตว์: "/category-banners/meat-banner.png",
  ไข่: "/category-banners/egg-banner.png",
  "นม/โยเกิร์ต": "/category-banners/milk-yogurt-banner.png",
  "แซนวิช/ขนมปัง": "/category-banners/sandwich-bread-banner.png",
  น้ำสมุนไพรโฮมเมด: "/category-banners/herbal-drink-banner.png",
  เบเกอรี่: "/category-banners/bakery-banner.png",
  สินค้าสัตว์เลี้ยง: "/category-banners/pet-banner.png",
  "แฟชั่น/ไลฟสไตล์": "/category-banners/fashion-lifestyle-banner.png",
  ไอทีและมือถือ: "/category-banners/it-mobile-banner.png",
  ของสด: "/category-banners/fresh-food-banner.png",
  ลูกอมและหมากฝรั่ง: "/category-banners/candy-gum-banner.png",
  ขนมไทย: "/category-banners/thai-dessert-banner.png",
  น้ำแข็ง: "/category-banners/ice-banner.png",
  บะหมี่กึ่งสำเร็จรูป: "/category-banners/instant-noodle-banner.png",
  อาหารแห้ง: "/category-banners/dry-food-banner.png",
  ของใช้ในบ้าน: "/category-banners/household-banner.png",
  "บุหรี่/ยาสูบ": "/category-banners/tobacco-banner.png",
  เครื่องดื่มแอลกอฮอล์: "/category-banners/alcohol-banner.png",
  อาหารกระป๋อง: "/category-banners/canned-food-banner.png",
  ช็อกโกแลต: "/category-banners/chocolate-banner.png",
  "บรรจุภัณฑ์และอุปกรณ์แพ็กอาหาร": "/category-banners/packaging-banner.png",
  ของแช่เย็น: "/category-banners/chilled-food-banner.png",
  สินค้าขายยกแพ็ก: "/category-banners/wholesale-pack-banner.png",
  "เครื่องดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)": "/category-banners/beverage-cute-banner.png",
  เครื่องปรุง: "/category-banners/seasoning-banner.png",
  ของใช้ส่วนตัว: "/category-banners/personal-care-banner.png",
  ของเล่น: "/category-banners/toys-banner.png",
  กิ๊ฟช็อป: "/category-banners/gift-shop-banner.png",
  ปฐมพยาบาล: "/category-banners/first-aid-banner.png"
};

// ไอคอนประจำหมวด (รูปแมวโทนครีมตามธีมร้าน) แสดงหน้าชื่อหมวดในแถบเลือกหมวด
const categoryIconImages: Record<string, string> = {
  ทั้งหมด: "/category-icons/all.png",
  "อุปกรณ์เครื่องเขียน/สำนักงาน": "/category-icons/stationery.png",
  ยาสามัญประจำบ้าน: "/category-icons/medicine.png",
  "สุขภาพ/สวย": "/category-icons/health-beauty.png",
  "อาหารเสริม/เวชสำอาง": "/category-icons/supplement.png",
  ขนมและของกินเล่น: "/category-icons/snacks.png",
  สินค้าใหม่แกะกล่อง: "/category-icons/new-arrivals.png",
  เนื้อสัตว์: "/category-icons/meat.png",
  ไข่: "/category-icons/egg.png",
  ผลไม้: "/category-icons/fruit.png",
  เลย์: "/category-icons/lay.png",
  "นม/โยเกิร์ต": "/category-icons/milk-yogurt.png",
  น้ำสมุนไพรโฮมเมด: "/category-icons/herbal-drink.png",
  สินค้าสัตว์เลี้ยง: "/category-icons/pet.png",
  "แฟชั่น/ไลฟสไตล์": "/category-icons/fashion-lifestyle.png",
  ของสด: "/category-icons/fresh-food.png",
  ของใช้ในบ้าน: "/category-icons/household.png",
  อาหารกระป๋อง: "/category-icons/canned-food.png",
  ช็อกโกแลต: "/category-icons/chocolate.png",
  น้ำแข็ง: "/category-icons/ice.png",
  "เครื่องดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)": "/category-icons/beverage.png",
  เครื่องดื่มแอลกอฮอล์: "/category-icons/alcohol.png",
  "แซนวิช/ขนมปัง": "/category-icons/sandwich-bread.png",
  เบเกอรี่: "/category-icons/bakery.png",
  อาหารแห้ง: "/category-icons/dry-food.png",
  ไอทีและมือถือ: "/category-icons/it-mobile.png",
  บะหมี่กึ่งสำเร็จรูป: "/category-icons/instant-noodle.png",
  ลูกอมและหมากฝรั่ง: "/category-icons/candy-gum.png",
  เครื่องปรุง: "/category-icons/seasoning.png",
  "บุหรี่/ยาสูบ": "/category-icons/tobacco.png",
  ของแช่เย็น: "/category-icons/chilled-food.png",
  สินค้าขายยกแพ็ก: "/category-icons/wholesale-pack.png",
  ขนมไทย: "/category-icons/thai-dessert.png",
  บรรจุภัณฑ์และอุปกรณ์แพ็กอาหาร: "/category-icons/packaging.png",
  ของใช้ส่วนตัว: "/category-icons/personal-care.png",
  ของเล่น: "/category-icons/toys.png",
  กิ๊ฟช็อป: "/category-icons/gift-shop.png",
  ปฐมพยาบาล: "/category-icons/first-aid.png"
};

const dryFoodCategory = "อาหารแห้ง";
const dryFoodSubcategories = [
  "ทั้งหมด",
  "อาหารสำเร็จรูป",
  "อาหารแห้ง",
  "อาหารกระป๋อง",
  "ส่วนประกอบการชง",
  "ธัญพืช",
  "เส้น",
  "เนื้อสัตว์และอาหารทะเลแปรรูป"
] as const;
type DryFoodSubcategory = (typeof dryFoodSubcategories)[number];

// หัวข้อย่อยที่กรองด้วย "หมวดของสินค้า" (อาหารแห้งเป็นหมวดรวมของหลายหมวดย่อย)
const dryFoodSubcategoryCategoryMap: Record<string, string[]> = {
  ทั้งหมด: ["บะหมี่กึ่งสำเร็จรูป", "อาหารแห้ง", "อาหารกระป๋อง", "ส่วนประกอบการชง"],
  อาหารสำเร็จรูป: ["บะหมี่กึ่งสำเร็จรูป"],
  อาหารแห้ง: ["อาหารแห้ง"],
  อาหารกระป๋อง: ["อาหารกระป๋อง"],
  ส่วนประกอบการชง: ["ส่วนประกอบการชง"]
};

// ทุกหมวดที่นับว่าเป็นสินค้าในกลุ่ม "อาหารแห้ง"
const dryFoodGroupCategories = dryFoodSubcategoryCategoryMap["ทั้งหมด"];

// ไอคอนของหัวข้อย่อย แยก map ตามหมวด เพราะชื่อหัวข้อย่อยซ้ำกันข้ามหมวดได้ (เช่น "ทั้งหมด")
const dryFoodSubcategoryIcons: Record<string, string> = {
  ธัญพืช: "/subcategory-icons/dry-food-grain.png"
};

// หัวข้อย่อยที่กรองด้วย "คีย์เวิร์ดชื่อสินค้า" (จำกัดเฉพาะสินค้าในกลุ่มอาหารแห้ง)
const dryFoodKeywordSubcategories: Record<string, string[]> = {
  ธัญพืช: ["ธัญพืช", "ถั่ว", "งา", "ลูกเดือย", "ข้าวสาร", "ข้าวเหนียว", "ข้าวกล้อง", "ข้าวหอมมะลิ", "ควินัว", "คีนัว", "ข้าวโอ๊ต", "เมล็ดทานตะวัน", "เม็ดมะม่วง", "อัลมอนด์", "แมคคาเดเมีย", "เมล็ดฟักทอง"],
  เส้น: ["เส้น", "วุ้นเส้น", "เส้นหมี่", "เส้นเล็ก", "เส้นใหญ่", "เส้นจันท์", "ก๋วยเตี๋ยว", "ก๋วยจั๊บ", "สปาเก็ตตี้", "สปาเกตตี", "พาสต้า", "มักกะโรนี", "เกี๊ยมอี๋", "เส้นบุก"],
  "เนื้อสัตว์และอาหารทะเลแปรรูป": ["กุ้งแห้ง", "กุ้งฝอย", "กุ้งแก้ว", "ปลาแห้ง", "ปลาเค็ม", "ปลากรอบ", "ปลาป่น", "ปลาเส้น", "ปลาสวรรค์", "ปลาหมึกแห้ง", "หมึกแห้ง", "หมูหยอง", "หมูแผ่น", "หมูเส้น", "หมูทุบ", "หมูยอ", "เนื้อเค็ม", "เนื้อสวรรค์", "กุนเชียง", "ไส้กรอกอีสาน", "แหนม", "แปรรูป"]
};

function matchesDryFoodSubcategory(product: Product, subcategory: DryFoodSubcategory) {
  const groupCategories = dryFoodSubcategoryCategoryMap[subcategory];

  if (groupCategories) {
    return groupCategories.includes(product.category);
  }

  // หัวข้อแบบคีย์เวิร์ด: ต้องอยู่ในกลุ่มอาหารแห้งก่อน แล้วค่อยเทียบชื่อสินค้า
  if (!dryFoodGroupCategories.includes(product.category)) {
    return false;
  }

  const searchableDryFoodText = `${product.name} ${product.sizeLabel ?? ""}`;

  return (dryFoodKeywordSubcategories[subcategory] ?? []).some((keyword) =>
    searchableDryFoodText.includes(keyword)
  );
}

const beverageCategory = "เครื่องดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)";
const beverageSubcategories = ["ทั้งหมด", "น้ำดื่ม/น้ำแร่", "น้ำอัดลม/โซดา", "น้ำผลไม้", "ชา", "กาแฟ", "สุขภาพ", "ชูกำลัง/เกลือแร่"] as const;
type BeverageSubcategory = (typeof beverageSubcategories)[number];

const beverageSubcategoryKeywords: Record<Exclude<BeverageSubcategory, "ทั้งหมด">, string[]> = {
  "น้ำดื่ม/น้ำแร่": ["น้ำทิพย์", "น้ำวีด้า", "น้ำดื่ม", "คริสตัล"],
  "น้ำอัดลม/โซดา": ["สิงห์", "โซดา", "เป๊บซี่", "โค้ก", "แฟนต้า", "มิรินด้า", "เซเว่นอัป", "สไปรท์"],
  น้ำผลไม้: ["น้ำผลไม้", "มาลี", "ทิปโก้", "ดอยคำ", "ดีโด้", "ยูนิฟ", "กาโตะ", "สแปลช", "Splash", "มินิทเมด", "Minute Maid", "น้ำส้ม", "น้ำองุ่น", "น้ำแอปเปิ้ล", "น้ำมะพร้าว", "น้ำลิ้นจี่", "สับปะรด"],
  ชา: ["เย็นเย็น", "น้ำจับใจ", "โออิชิ", "อิชิตัน"],
  กาแฟ: ["เนสกาแฟ", "กาแฟเบอร์ดี้", "กาแฟ"],
  สุขภาพ: ["ยันฮี", "แบรนด์", "วีด้า"],
  "ชูกำลัง/เกลือแร่": ["M150", "ลิโพ", "กระทิงแดง", "คาราบาว", "โสมเกาหลี", "สปอนเซอร์"]
};

function matchesBeverageSubcategory(product: Product, subcategory: BeverageSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  return beverageSubcategoryKeywords[subcategory].some((keyword) => product.name.includes(keyword));
}

const milkCategory = "นม/โยเกิร์ต";
const milkSubcategories = [
  "ทั้งหมด",
  "นม",
  "โยเกิร์ต",
  "นมถั่วเหลือง / น้ำเต้าหู้",
  "นมเปรี้ยว"
] as const;
type MilkSubcategory = (typeof milkSubcategories)[number];

function matchesMilkSubcategory(product: Product, subcategory: MilkSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchableMilkText = `${product.name} ${product.sizeLabel ?? ""}`;
  const isSoy = ["ถั่วเหลือง", "น้ำเต้าหู้", "นมถั่ว", "แลคตาซอย", "Lactasoy", "ไวตามิลค์", "ไวตามิ้ลค์", "วีซอย", "V-Soy", "ดีน่า"].some(
    (keyword) => searchableMilkText.includes(keyword)
  );
  const isSour = ["นมเปรี้ยว", "เปรี้ยว", "ยาคูลท์", "Yakult", "ดัชชี่", "Dutchie", "บีทาเก้น", "Betagen", "ดีไลท์"].some((keyword) =>
    searchableMilkText.includes(keyword)
  );
  const isYogurt = ["โยเกิร์ต", "Yogurt", "โยเกิ"].some((keyword) => searchableMilkText.includes(keyword));

  if (subcategory === "นมถั่วเหลือง / น้ำเต้าหู้") {
    return isSoy;
  }

  if (subcategory === "นมเปรี้ยว") {
    return isSour;
  }

  if (subcategory === "โยเกิร์ต") {
    return isYogurt;
  }

  // นม (นมจืด/นมรสต่างๆ) — ตัดถั่วเหลือง/นมเปรี้ยว/โยเกิร์ตออก
  if (isSoy || isSour || isYogurt) {
    return false;
  }

  return ["นม", "Milk", "เมจิ", "meiji", "โฟร์โมสต์", "Foremost", "ดัชมิลล์", "Dutch Mill", "หนองโพ", "โชคชัย", "แมกโนเลีย"].some(
    (keyword) => searchableMilkText.includes(keyword)
  );
}

const supplementCategory = "อาหารเสริม/เวชสำอาง";
const supplementSubcategories = [
  "ทั้งหมด",
  "วิตามิน",
  "อาหารเสริม",
  "ดูแลผิวหน้า",
  "กันแดด",
  "ดูแลผิวกาย",
  "ดูแลริมฝีปาก",
  "เวชสำอาง",
  "ดูแลเส้นผม"
] as const;
type SupplementSubcategory = (typeof supplementSubcategories)[number];

const supplementSubcategoryKeywords: Record<Exclude<SupplementSubcategory, "ทั้งหมด">, string[]> = {
  วิตามิน: ["วิตามิน", "Vitamin", "Vit", "ซิงก์", "Zinc", "เกลือแร่", "Fish Oil", "น้ำมันปลา", "แร่ธาตุ"],
  อาหารเสริม: ["อาหารเสริม", "Supplement", "โปรตีน", "Protein", "กลูต้า", "Gluta", "Collagen", "คอลลาเจน", "ไฟเบอร์", "Fiber"],
  ดูแลผิวหน้า: ["ผิวหน้า", "หน้า", "เซรั่ม", "Serum", "ครีมหน้า", "โฟม", "คลีนเซอร์", "ล้างหน้า", "สกินแคร์"],
  กันแดด: ["กันแดด", "Sun", "Sunscreen", "UV"],
  ดูแลผิวกาย: ["ผิวกาย", "โลชั่น", "บอดี้", "Body", "ครีมทาตัว", "สบู่", "อาบน้ำ"],
  ดูแลริมฝีปาก: ["ริมฝีปาก", "ลิป", "Lip", "ปาก"],
  เวชสำอาง: ["เวชสำอาง", "Eucerin", "La Roche", "Cetaphil", "Smooth E", "Acne", "สิว", "Sensitive"],
  ดูแลเส้นผม: ["เส้นผม", "ผม", "แชมพู", "ครีมนวด", "ทรีตเมนต์", "Hair"]
};

function matchesSupplementSubcategory(product: Product, subcategory: SupplementSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchableSupplementText = `${product.name} ${product.sizeLabel ?? ""}`;

  return supplementSubcategoryKeywords[subcategory].some((keyword) => searchableSupplementText.includes(keyword));
}

const healthBeautyCategory = "สุขภาพ/สวย";
const healthBeautySubcategories = [
  "ทั้งหมด",
  "ยาและเวชภัณฑ์",
  "อุปกรณ์สุขภาพ",
  "สุขอนามัย",
  "ป้องกันแมลง",
  "ดูแลช่องปาก",
  "แม่และเด็ก"
] as const;
type HealthBeautySubcategory = (typeof healthBeautySubcategories)[number];

const healthBeautySubcategoryKeywords: Record<Exclude<HealthBeautySubcategory, "ทั้งหมด">, string[]> = {
  ยาและเวชภัณฑ์: ["ยา", "เวชภัณฑ์", "พารา", "พาราเซตามอล", "แก้ปวด", "ลดไข้", "ยาแก้", "ยาหม่อง", "ยาดม"],
  อุปกรณ์สุขภาพ: ["อุปกรณ์สุขภาพ", "ปรอท", "เทอร์โมมิเตอร์", "เครื่องวัด", "หน้ากาก", "แมสก์", "ถุงมือ"],
  สุขอนามัย: ["สุขอนามัย", "แชมพู", "ครีมนวด", "สบู่", "เจลล้างมือ", "ทิชชู่", "ผ้าอนามัย", "แป้ง", "โลชั่น"],
  ป้องกันแมลง: ["ป้องกันแมลง", "ยากันยุง", "กันยุง", "ไล่ยุง", "แมลง", "สเปรย์กันยุง"],
  ดูแลช่องปาก: ["ดูแลช่องปาก", "แปรงสีฟัน", "ยาสีฟัน", "น้ำยาบ้วนปาก", "ไหมขัดฟัน", "ช่องปาก"],
  แม่และเด็ก: ["แม่และเด็ก", "เด็ก", "ทารก", "แพมเพิร์ส", "ผ้าอ้อม", "ขวดนม", "จุกนม", "แป้งเด็ก"]
};

function matchesHealthBeautySubcategory(product: Product, subcategory: HealthBeautySubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchableHealthBeautyText = `${product.name} ${product.sizeLabel ?? ""}`;

  return healthBeautySubcategoryKeywords[subcategory].some((keyword) => searchableHealthBeautyText.includes(keyword));
}

const medicineCategory = "ยาสามัญประจำบ้าน";
const medicineSubcategories = [
  "ทั้งหมด",
  "แก้ปวด / ลดไข้",
  "หวัด / ไอ / เจ็บคอ",
  "ระบบทางเดินอาหาร",
  "ภูมิแพ้",
  "ผิวหนัง / แมลงกัดต่อย",
  "ปวดเมื่อย",
  "ยาสมุนไพร / บรรเทาอาการ",
  "ยาดม / ยาหม่อง",
  "ตา / หู / จมูก"
] as const;
type MedicineSubcategory = (typeof medicineSubcategories)[number];

const medicineSubcategoryKeywords: Record<Exclude<MedicineSubcategory, "ทั้งหมด">, string[]> = {
  "แก้ปวด / ลดไข้": ["แก้ปวด", "ลดไข้", "ไข้", "ปวดหัว", "ปวดศีรษะ", "พารา", "พาราเซตามอล", "ไทลินอล", "Tylenol", "ซาร่า", "Sara", "ทัมใจ", "บวดหาย", "แอสไพริน", "Aspirin", "ไอบูโพรเฟน", "Ibuprofen"],
  "หวัด / ไอ / เจ็บคอ": ["หวัด", "แก้หวัด", "ไอ", "แก้ไอ", "เจ็บคอ", "เสมหะ", "ละลายเสมหะ", "น้ำมูก", "คัดจมูก", "ทิฟฟี่", "Tiffy", "ดีคอลเจน", "Decolgen", "ยาอม", "สเตร็ปซิล", "Strepsils", "ฟิชเชอร์แมน", "มายบาซิน", "กษัยการ"],
  "ระบบทางเดินอาหาร": ["ท้องเสีย", "ท้องเดิน", "ท้องอืด", "ท้องเฟ้อ", "อาหารไม่ย่อย", "ยาธาตุ", "ขับลม", "ผงถ่าน", "คาร์บอน", "เกลือแร่", "ORS", "โออาร์เอส", "อีโน", "Eno", "ยาลดกรด", "กรดไหลย้อน", "แอนตาซิล", "Antacid", "ท้องผูก", "ยาระบาย", "ถ่ายพยาธิ", "พยาธิ"],
  "ภูมิแพ้": ["ภูมิแพ้", "แก้แพ้", "แพ้อากาศ", "คลอเฟนิรามีน", "Chlorpheniramine", "CPM", "ลอราทาดีน", "Loratadine", "เซทิริซีน", "Cetirizine", "แอนตี้ฮีสตามีน", "ลมพิษ"],
  "ผิวหนัง / แมลงกัดต่อย": ["ผิวหนัง", "แมลงกัด", "แมลงสัตว์กัดต่อย", "ยุงกัด", "ทาแก้คัน", "แก้คัน", "คาลาไมน์", "Calamine", "ผื่น", "เชื้อรา", "กลาก", "เกลื้อน", "เบตาดีน", "Betadine", "ยาแดง", "ยาม่วง", "เจนเชียน", "ใส่แผล", "ครีมทาแผล", "ยากันยุง", "กันยุง", "เสลดพังพอน", "พญายอ", "คาดรามีน", "Cadramine", "คาเนสเทน", "Canesten", "ไลมาริน", "Lymarin", "คีล่า", "Kela", "ไดโป", "Dipo", "ฟังจิเดอร์ม", "Fungiderm", "ซีมา", "Zema", "ฮ่องกงฟุต", "โทนาฟ", "TONAF", "ไมโครัล", "โคลไทรมาโซล", "Clotrimazole", "แฟงโก้", "Fango", "เดอร์มาติกซ์", "Dermatix", "แผลเป็น"],
  "ปวดเมื่อย": ["ปวดเมื่อย", "ปวดกล้ามเนื้อ", "ปวดข้อ", "ปวดหลัง", "ปวดเอว", "เคาน์เตอร์เพน", "Counterpain", "ยานวด", "เจลนวด", "แผ่นแปะ", "แปะแก้ปวด", "ซาลอนพาส", "Salonpas"],
  "ยาสมุนไพร / บรรเทาอาการ": ["สมุนไพร", "ฟ้าทะลายโจร", "ขมิ้นชัน", "ขิง", "กระชาย", "ยาเขียว", "ยาหอม", "ประสะ", "ยาลม", "ยาต้ม", "ยาผง", "มะขามแขก", "ชาสมุนไพร", "กษัยเส้น", "เขากวาง", "เขากุ้ย", "Kao-Kui", "อภัยภูเบศร", "ตัวร้อน"],
  "ยาดม / ยาหม่อง": ["ยาดม", "ยาหม่อง", "ยาน้ำมัน", "แอมโมเนียหอม", "เซียงเพียว", "Siang Pure", "โป๊ยเซียน", "เพพเพอร์มินต์", "หม่องน้ำ", "หม่องขาว", "หม่องเหลือง", "ตราถ้วยทอง", "โพยไซอัน", "พิมเสน", "โอสถทิพย์", "น้ำมันเขียว", "น้ำมันมวย", "มวย", "วิกส์", "Vicks", "วาโปรับ"],
  "ตา / หู / จมูก": ["หยอดตา", "ล้างตา", "น้ำตาเทียม", "ยาป้ายตา", "ตาแดง", "หยอดหู", "ยาหู", "หยอดจมูก", "พ่นจมูก", "สเปรย์จมูก", "ล้างจมูก", "น้ำเกลือ", "โรฮ์โต", "Rohto", "วิสิน", "Visine"]
};

function matchesMedicineSubcategory(product: Product, subcategory: MedicineSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchableMedicineText = `${product.name} ${product.sizeLabel ?? ""}`;

  return medicineSubcategoryKeywords[subcategory].some((keyword) => searchableMedicineText.includes(keyword));
}

const firstAidCategory = "ปฐมพยาบาล";
const firstAidSubcategories = [
  "ทั้งหมด",
  "พลาสเตอร์และผ้าปิดแผล",
  "ผ้าก๊อซและอุปกรณ์พันแผล",
  "น้ำยาทำแผล",
  "ดูแลแผลไฟไหม้และแมลงกัดต่อย",
  "ประคบร้อน-เย็น"
] as const;
type FirstAidSubcategory = (typeof firstAidSubcategories)[number];

const firstAidSubcategoryKeywords: Record<Exclude<FirstAidSubcategory, "ทั้งหมด">, string[]> = {
  พลาสเตอร์และผ้าปิดแผล: ["พลาสเตอร์", "ปิดแผล", "ผ้าปิดแผล", "แผ่นปิดแผล", "เทปปิดแผล", "แฮนซาพลาส", "Hansaplast"],
  ผ้าก๊อซและอุปกรณ์พันแผล: ["ผ้าก๊อซ", "ก๊อซ", "ผ้าพันแผล", "ผ้าพัน", "ผ้ายืดพันแผล", "สำลี", "ก้านสำลี", "คอตตอนบัด", "เทปพันแผล", "เทปเยื่อกระดาษ"],
  น้ำยาทำแผล: ["น้ำยาทำแผล", "ทำแผล", "เบตาดีน", "Betadine", "โพวิโดน", "แอลกอฮอล์", "ไฮโดรเจนเปอร์ออกไซด์", "น้ำเกลือล้างแผล", "ทิงเจอร์", "ยาแดง", "ยาม่วง", "เจนเชียน"],
  ดูแลแผลไฟไหม้และแมลงกัดต่อย: ["ไฟไหม้", "น้ำร้อนลวก", "แผลไฟไหม้", "แมลงกัด", "แมลงสัตว์กัดต่อย", "ยุงกัด", "ทาแก้คัน", "แก้คัน", "คาลาไมน์", "Calamine", "ว่านหางจระเข้", "เจลว่านหางจระเข้", "บิวรี่"],
  "ประคบร้อน-เย็น": ["ประคบ", "ประคบร้อน", "ประคบเย็น", "เจลประคบ", "แผ่นประคบ", "ถุงน้ำร้อน", "ไอซ์แพ็ค", "Ice Pack", "โคลด์แพ็ค", "แผ่นแปะลดไข้", "เจลลดไข้"]
};

function matchesFirstAidSubcategory(product: Product, subcategory: FirstAidSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchableFirstAidText = `${product.name} ${product.sizeLabel ?? ""}`;

  return firstAidSubcategoryKeywords[subcategory].some((keyword) => searchableFirstAidText.includes(keyword));
}

const householdCategory = "ของใช้ในบ้าน";
const householdSubcategories = ["ทั้งหมด", "ธูป เทียน และอุปกรณ์จุดไฟ"] as const;
type HouseholdSubcategory = (typeof householdSubcategories)[number];

const householdSubcategoryKeywords: Record<Exclude<HouseholdSubcategory, "ทั้งหมด">, string[]> = {
  "ธูป เทียน และอุปกรณ์จุดไฟ": ["ธูป", "เทียน", "ไฟแช็ค", "ไฟแช็ก", "ไม้ขีด", "จุดไฟ", "เชื้อเพลิง", "แก๊สกระป๋อง", "แก๊สปิกนิก", "น้ำมันก๊าด", "ตะเกียง", "ก้อนจุดไฟ"]
};

function matchesHouseholdSubcategory(product: Product, subcategory: HouseholdSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchableHouseholdText = `${product.name} ${product.sizeLabel ?? ""}`;

  return householdSubcategoryKeywords[subcategory].some((keyword) => searchableHouseholdText.includes(keyword));
}

const alcoholCategory = "เครื่องดื่มแอลกอฮอล์";
const alcoholSubcategories = ["ทั้งหมด", "กระป๋อง", "ขวด", "แบน", "กลม"] as const;
type AlcoholSubcategory = (typeof alcoholSubcategories)[number];

function matchesAlcoholSubcategory(product: Product, subcategory: AlcoholSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchableAlcoholText = `${product.name} ${product.unit} ${product.sizeLabel ?? ""}`;

  return searchableAlcoholText.includes(subcategory);
}

const petCategory = "สินค้าสัตว์เลี้ยง";
const petSubcategories = ["ทั้งหมด", "อาหารเม็ดสุนัข/หมา", "อาหารเม็ดแมว", "ขนมสุนัข/แมว", "ของเล่นสัตว์เลี้ยง"] as const;
type PetSubcategory = (typeof petSubcategories)[number];

const petSubcategoryKeywords: Record<Exclude<PetSubcategory, "ทั้งหมด">, string[]> = {
  "อาหารเม็ดสุนัข/หมา": ["อาหารเม็ดสุนัข", "อาหารเม็ดหมา"],
  อาหารเม็ดแมว: ["อาหารเม็ดแมว"],
  "ขนมสุนัข/แมว": ["ขนม", "ทานเล่น", "แมวเลีย", "Okashi", "โอคาชิ", "Tinkerbell", "ทิงเกอร์เบลล์"],
  ของเล่นสัตว์เลี้ยง: ["ของเล่นแมว", "ของเล่นสุนัข", "ของเล่นหมา", "ของเล่นสัตว์เลี้ยง"]
};

function matchesPetSubcategory(product: Product, subcategory: PetSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchablePetText = `${product.name}`;

  return petSubcategoryKeywords[subcategory].some((keyword) => searchablePetText.includes(keyword));
}

const herbalDrinkCategory = "น้ำสมุนไพรโฮมเมด";
const herbalDrinkSubcategories = ["ทั้งหมด", "น้ำสมุนไพรมีน้ำตาล", "น้ำสมุนไพรไม่มีน้ำตาล"] as const;
type HerbalDrinkSubcategory = (typeof herbalDrinkSubcategories)[number];

function matchesHerbalDrinkSubcategory(product: Product, subcategory: HerbalDrinkSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchableHerbalText = `${product.name} ${product.sizeLabel ?? ""}`;
  const isNoSugar = searchableHerbalText.includes("ไม่มีน้ำตาล");

  return subcategory === "น้ำสมุนไพรไม่มีน้ำตาล" ? isNoSugar : !isNoSugar;
}

const personalCareCategory = "ของใช้ส่วนตัว";
const personalCareSubcategories = [
  "ทั้งหมด",
  "ผ้าอนามัย",
  "ผ้าอนามัยแบบกางเกงใน",
  "ผลิตภัณฑ์ทำความสะอาดจุดซ่อนเร้น"
] as const;
type PersonalCareSubcategory = (typeof personalCareSubcategories)[number];

function matchesPersonalCareSubcategory(product: Product, subcategory: PersonalCareSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchablePersonalCareText = `${product.name} ${product.sizeLabel ?? ""}`;
  const isPants = searchablePersonalCareText.includes("กางเกง");
  const isWash =
    searchablePersonalCareText.includes("ทำความสะอาด") ||
    searchablePersonalCareText.includes("จุดซ่อนเร้น") ||
    searchablePersonalCareText.includes("เฟมินิน") ||
    searchablePersonalCareText.includes("Feminine");

  if (subcategory === "ผ้าอนามัยแบบกางเกงใน") {
    return isPants;
  }

  if (subcategory === "ผลิตภัณฑ์ทำความสะอาดจุดซ่อนเร้น") {
    return isWash;
  }

  // ผ้าอนามัย (แบบแผ่น) — ตัดชนิดกางเกงในและผลิตภัณฑ์ทำความสะอาดออก
  if (isPants || isWash) {
    return false;
  }

  return ["ผ้าอนามัย", "โซฟี", "SOFY", "Sofy", "ลอรีเอะ", "Laurier", "เอลิส", "elis", "Elis"].some((keyword) =>
    searchablePersonalCareText.includes(keyword)
  );
}

const instantNoodleCategory = "บะหมี่กึ่งสำเร็จรูป";
const instantNoodleSubcategories = ["ทั้งหมด", "มาม่า", "มาม่า OK", "ไวไว (Wai Wai)", "ยำยำ (Yum Yum)", "ควิก", "นิสชิน (Nissin)", "ซัมยัง (Samyang)", "มาม่าเกาหลี"] as const;
type InstantNoodleSubcategory = (typeof instantNoodleSubcategories)[number];

const instantNoodleSubcategoryKeywords: Record<Exclude<InstantNoodleSubcategory, "ทั้งหมด">, string[]> = {
  มาม่า: ["มาม่า"],
  "มาม่า OK": ["มาม่า OK", "มาม่าโอเค", "Mama OK", "MAMA OK"],
  "ไวไว (Wai Wai)": ["ไวไว", "Wai Wai", "WaiWai"],
  "ยำยำ (Yum Yum)": ["ยำยำ", "Yum Yum", "YumYum"],
  ควิก: ["ควิก", "Quick", "QUICK"],
  "นิสชิน (Nissin)": ["นิสชิน", "Nissin"],
  "ซัมยัง (Samyang)": ["ซัมยัง", "Samyang"],
  มาม่าเกาหลี: ["มาม่าเกาหลี", "เกาหลี", "Korean"]
};

function matchesInstantNoodleSubcategory(product: Product, subcategory: InstantNoodleSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchableNoodleText = `${product.name}`;

  return instantNoodleSubcategoryKeywords[subcategory].some((keyword) => searchableNoodleText.includes(keyword));
}

const candyCategory = "ลูกอมและหมากฝรั่ง";
const candySubcategories = ["ทั้งหมด", "ลูกอม", "หมากฝรั่ง"] as const;
type CandySubcategory = (typeof candySubcategories)[number];

const candySubcategoryKeywords: Record<Exclude<CandySubcategory, "ทั้งหมด">, string[]> = {
  ลูกอม: ["ลูกอม", "อมยิ้ม", "candy", "lollipop"],
  หมากฝรั่ง: ["หมากฝรั่ง", "gum", "chewing gum"]
};

function matchesCandySubcategory(product: Product, subcategory: CandySubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchableCandyText = `${product.name}`;

  return candySubcategoryKeywords[subcategory].some((keyword) => searchableCandyText.includes(keyword));
}

const meatCategory = "เนื้อสัตว์";
const meatSubcategories = ["ทั้งหมด", "เนื้อหมู", "เนื้อไก่", "เนื้อปลา"] as const;
type MeatSubcategory = (typeof meatSubcategories)[number];

function matchesMeatSubcategory(product: Product, subcategory: MeatSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  return product.name.includes(subcategory);
}

const eggCategory = "ไข่";
const eggSubcategories = ["ทั้งหมด", "ไข่ไก่", "ไข่เป็ด", "ไข่นกกระทา", "ไข่เค็ม", "ไข่เยี่ยวม้า"] as const;
type EggSubcategory = (typeof eggSubcategories)[number];

function matchesEggSubcategory(product: Product, subcategory: EggSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  return product.name.includes(subcategory);
}

const legacyCategoryMap: Record<string, string> = {
  เครื่องเขียน: "อุปกรณ์เครื่องเขียน/สำนักงาน",
  ขนมลูกอม: "ลูกอมและหมากฝรั่ง",
  "เจลลี่ เยลลี่": "ขนมและของกินเล่น",
  ขนมห่อเล็ก: "ขนมและของกินเล่น",
  ขนมห่อใหญ่: "ขนมและของกินเล่น",
  "เหล้า เบียร์ สุรา": "เครื่องดื่มแอลกอฮอล์",
  "บุหรี่ ยาสูบ": "บุหรี่/ยาสูบ",
  ยาสมุนไพร: "ยาสามัญประจำบ้าน",
  ไฟแช็ค: "ของใช้ในบ้าน",
  ของใช้: "ของใช้ในบ้าน",
  เครื่องครัว: "ของใช้ในบ้าน",
  เครื่องปรุง: "เครื่องปรุง",
  "สุขภาพ/ความงาม": healthBeautyCategory,
  "แชมพู ครีมนวด": healthBeautyCategory,
  แปรงสีฟัน: healthBeautyCategory,
  แซนวิช: "แซนวิช/ขนมปัง",
  ขนมปัง: "แซนวิช/ขนมปัง",
  เครื่องดื่ม: "เครื่องดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)",
  หมวดเครื่องดื่ม: "เครื่องดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)",
  น้ำดื่ม: "เครื่องดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)",
  "ไอที/และมือถือ": "ไอทีและมือถือ",
  "ไอที/เเละมือถือ": "ไอทีและมือถือ",
  "แฟชั่น/ไลฟ์สไตล์": "แฟชั่น/ไลฟสไตล์",
  "เครื่อมดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)": "เครื่องดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)",
  "เครื่องดื่ม (น้ำดื่ม น้ำอัดลม ชา กาแฟ)": "เครื่องดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)",
  สินค้าใหม่: "สินค้าใหม่แกะกล่อง",
  สินค้าเสริมแต้มบุญ: "สินค้าใหม่แกะกล่อง",
  "อื่น ๆ": "สินค้าใหม่แกะกล่อง"
};


function normalizeCategory(category: string) {
  return legacyCategoryMap[category] ?? category;
}

// ย้ายหมวดของสินค้าเดิมที่บันทึกไว้ใน localStorage ให้ตรงกับหมวดปัจจุบัน
const legacyProductCategoryMap: Record<string, string> = {
  น้ำปลาแท้: "เครื่องปรุง"
};

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/รส/g, "")
    .replace(/[()\s/+·฿-]/g, "");
}


function hydrateProduct(product: Product): Product {
  const name = legacyProductNameMap[product.name] ?? product.name;
  const sizeLabel =
    product.name !== name && name.includes("กระป๋องยาว") ? "กระป๋องยาว" : product.sizeLabel;
  const normalizedCategory = legacyProductCategoryMap[name] ?? normalizeCategory(product.category);
  const shouldMoveFromAlcoholToBeverage =
    normalizedCategory === "เครื่องดื่มแอลกอฮอล์" && !alcoholProductNames.has(name);
  const category = alcoholProductNames.has(name)
    ? "เครื่องดื่มแอลกอฮอล์"
    : beverageProductNames.has(name) || shouldMoveFromAlcoholToBeverage
      ? "เครื่องดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)"
      : normalizedCategory;
  const perVariantImage = productImageByKey[`${name} | ${sizeLabel ?? ""}`];
  const imageUrl =
    category === "เลย์"
      ? layLargeProductImageByName[name]
      : perVariantImage ?? productImageByName[name];
  const price = productPriceByName[name] ?? product.price;
  const stock = productStockByName[name] ?? product.stock;

  if (imageUrl && product.imageUrl !== imageUrl) {
    return {
      ...product,
      name,
      category,
      price,
      stock,
      sizeLabel,
      imageUrl
    };
  }

  // สินค้าชื่อซ้ำหลายแบบ: ยึดรูปตามแบบ (perVariantImage) เป็นหลัก — แบบที่ไม่มีรูปให้ล้างของเก่าออก
  if (perVariantOnlyNames.has(name) && product.imageUrl !== imageUrl) {
    return {
      ...product,
      name,
      category,
      price,
      stock,
      sizeLabel,
      imageUrl
    };
  }

  return {
    ...product,
    name,
    category,
    price,
    stock,
    sizeLabel
  };
}

function getProductKey(product: Product) {
  return `${product.category}|${product.name}|${product.price}|${product.sizeLabel ?? product.unit}`;
}

function getDedupedProducts(productsToDedupe: Product[]) {
  const productMap = new Map<string, Product>();

  productsToDedupe.forEach((product) => {
    const key = getProductKey(product);

    if (!productMap.has(key)) {
      productMap.set(key, product);
    }
  });

  return Array.from(productMap.values());
}

function sortProducts(productA: Product, productB: Product) {
  if (productA.category === "เลย์" && productB.category === "เลย์") {
    const flavorA = layFlavors.findIndex((flavor) => flavor.name === productA.name);
    const flavorB = layFlavors.findIndex((flavor) => flavor.name === productB.name);
    const orderA = flavorA === -1 ? Number.MAX_SAFE_INTEGER : flavorA;
    const orderB = flavorB === -1 ? Number.MAX_SAFE_INTEGER : flavorB;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return productA.price - productB.price;
  }

  if (productA.category === "เลย์") {
    return 1;
  }

  if (productB.category === "เลย์") {
    return -1;
  }

  return productA.id - productB.id;
}

function mergeSavedProducts(savedProducts: Product[]) {
  const hydratedProducts = savedProducts
    .filter((product) => typeof product.id === "number")
    .map((product) => hydrateProduct(product))
    .filter((product) => product.name !== "บุหรี่ซองแดง")
    .filter((product) => product.name !== "น้ำแข็ง 5 บาท")
    .filter((product) => !product.name.startsWith("ตาวัน"))
    .filter((product) => !(product.category === "สินค้าสัตว์เลี้ยง" && product.isPlaceholder))
    .filter((product) => !(product.category === "เลย์" && product.price !== 5 && product.price !== 20))
    .filter(
      (product) =>
        !(
          product.name === "น้ำสมุนไพรโฮมเมด" &&
          product.category === "เครื่องดื่ม(น้ำดื่ม น้ำอัดลม ชา กาแฟ)" &&
          product.isPlaceholder
        )
    );
  const dedupedProducts = getDedupedProducts(hydratedProducts);
  const existingKeys = new Set(dedupedProducts.map((product) => getProductKey(product)));
  const missingInitialProducts = initialProducts
    .filter((product) => !existingKeys.has(getProductKey(product)))
    .map((product) => hydrateProduct(product));

  return getDedupedProducts([...dedupedProducts, ...missingInitialProducts]).sort(sortProducts);
}

function getCategoryLabel(category: string) {
  return category;
}

function getProductCategoryLabel(product: Product) {
  return product.category;
}

function getPriceBadgeClass(product: Product) {
  return product.price === 5 ? "price-badge-small" : "price-badge-large";
}

function getStatus(product: Product): StockStatus {
  if (product.isPlaceholder) {
    return "พร้อมขาย";
  }

  if (product.stock === 0) {
    return "หมด";
  }

  if (product.stock <= product.minStock) {
    return "ใกล้หมด";
  }

  return "พร้อมขาย";
}

function statusStyle(status: StockStatus) {
  if (status === "หมด") {
    return { color: "red" as const, icon: <ExclamationCircleFilled /> };
  }

  if (status === "ใกล้หมด") {
    return { color: "warning" as const, icon: <WarningFilled /> };
  }

  return { color: "success" as const, icon: <CheckCircleFilled /> };
}

// โลโก้แมวโทนครีมชานม ใช้เป็นสัญลักษณ์ร้าน
function CatMark({
  size = 28,
  fur = "#fdf4e4",
  outline = "#6f4a2b"
}: {
  size?: number;
  fur?: string;
  outline?: string;
}) {
  return (
    <svg
      className="cat-mark"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke={outline} strokeWidth={2.6} strokeLinejoin="round" strokeLinecap="round">
        <path d="M12 21 L14.5 7.5 L26 16 Z" fill={fur} />
        <path d="M36 21 L33.5 7.5 L22 16 Z" fill={fur} />
        <path
          d="M24 14.5 C33 14.5 39.5 20.5 39.5 28.5 C39.5 36 32.5 41.5 24 41.5 C15.5 41.5 8.5 36 8.5 28.5 C8.5 20.5 15 14.5 24 14.5 Z"
          fill={fur}
        />
      </g>
      {/* หูชั้นใน */}
      <g fill={outline} opacity={0.22}>
        <path d="M15.5 12.5 L17 18.5 L21 15.2 Z" />
        <path d="M32.5 12.5 L31 18.5 L27 15.2 Z" />
      </g>
      {/* ตา จมูก */}
      <g fill={outline}>
        <circle cx="19" cy="28.5" r="2.1" />
        <circle cx="29" cy="28.5" r="2.1" />
      </g>
      <path d="M24 34 l-2.6 -2.4 h5.2 Z" fill="#d98c8c" stroke={outline} strokeWidth={1} strokeLinejoin="round" />
      {/* หนวด */}
      <g stroke={outline} strokeWidth={1.5} strokeLinecap="round">
        <path d="M24 34.4 L24 36.4" />
        <path d="M12 29 L4.5 27 M12 32.4 L5 34" />
        <path d="M36 29 L43.5 27 M36 32.4 L43 34" />
      </g>
    </svg>
  );
}

// รอยเท้าแมว ใช้เป็นลวดลายตกแต่ง
function PawMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="paw-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="16" cy="20.5" rx="7.5" ry="6.5" />
      <ellipse cx="7.5" cy="12.5" rx="3" ry="4" />
      <ellipse cx="13" cy="8" rx="3" ry="4.2" />
      <ellipse cx="19" cy="8" rx="3" ry="4.2" />
      <ellipse cx="24.5" cy="12.5" rx="3" ry="4" />
    </svg>
  );
}

export default function Home() {
  const { message } = App.useApp();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [query, setQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [category, setCategory] = useState("ทั้งหมด");
  const [dryFoodSubcategory, setDryFoodSubcategory] = useState<DryFoodSubcategory>("ทั้งหมด");
  const [beverageSubcategory, setBeverageSubcategory] = useState<BeverageSubcategory>("ทั้งหมด");
  const [supplementSubcategory, setSupplementSubcategory] = useState<SupplementSubcategory>("ทั้งหมด");
  const [healthBeautySubcategory, setHealthBeautySubcategory] = useState<HealthBeautySubcategory>("ทั้งหมด");
  const [medicineSubcategory, setMedicineSubcategory] = useState<MedicineSubcategory>("ทั้งหมด");
  const [firstAidSubcategory, setFirstAidSubcategory] = useState<FirstAidSubcategory>("ทั้งหมด");
  const [householdSubcategory, setHouseholdSubcategory] = useState<HouseholdSubcategory>("ทั้งหมด");
  const [personalCareSubcategory, setPersonalCareSubcategory] = useState<PersonalCareSubcategory>("ทั้งหมด");
  const [milkSubcategory, setMilkSubcategory] = useState<MilkSubcategory>("ทั้งหมด");
  const [alcoholSubcategory, setAlcoholSubcategory] = useState<AlcoholSubcategory>("ทั้งหมด");
  const [petSubcategory, setPetSubcategory] = useState<PetSubcategory>("ทั้งหมด");
  const [herbalDrinkSubcategory, setHerbalDrinkSubcategory] = useState<HerbalDrinkSubcategory>("ทั้งหมด");
  const [instantNoodleSubcategory, setInstantNoodleSubcategory] = useState<InstantNoodleSubcategory>("ทั้งหมด");
  const [candySubcategory, setCandySubcategory] = useState<CandySubcategory>("ทั้งหมด");
  const [meatSubcategory, setMeatSubcategory] = useState<MeatSubcategory>("ทั้งหมด");
  const [eggSubcategory, setEggSubcategory] = useState<EggSubcategory>("ทั้งหมด");
  const [status, setStatus] = useState<"ทั้งหมด" | StockStatus>("ทั้งหมด");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [previewBanner, setPreviewBanner] = useState<{ imageUrl: string; title: string } | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [shopImageUrl, setShopImageUrl] = useState(defaultShopImageUrl);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginForm] = Form.useForm<{ username: string; password: string }>();
  const isStaff = staffName !== null;
  const categoryRowRef = useRef<HTMLDivElement>(null);
  const [form] = Form.useForm<ProductFormValues>();

  useEffect(() => {
    const savedProducts = window.localStorage.getItem(storageKey);

    if (savedProducts) {
      const parsedProducts = JSON.parse(savedProducts) as Product[];

      setProducts(mergeSavedProducts(parsedProducts));
    }

    const savedSearchHistory = window.localStorage.getItem(searchHistoryStorageKey);

    if (savedSearchHistory) {
      setSearchHistory(JSON.parse(savedSearchHistory) as string[]);
    }

    const savedShopImage = window.localStorage.getItem(shopImageStorageKey);

    if (savedShopImage) {
      setShopImageUrl(savedShopImage);
    }

    const savedStaffName = window.localStorage.getItem(authStorageKey);

    if (savedStaffName) {
      setStaffName(savedStaffName);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    window.localStorage.setItem(searchHistoryStorageKey, JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    if (shopImageUrl) {
      window.localStorage.setItem(shopImageStorageKey, shopImageUrl);
    }
  }, [shopImageUrl]);

  const categories = useMemo(() => {
    return ["ทั้งหมด", ...defaultCategories];
  }, []);

  const summary = useMemo(() => {
    const outOfStock = products.filter((item) => getStatus(item) === "หมด").length;
    const lowStock = products.filter((item) => getStatus(item) === "ใกล้หมด").length;
    const totalStock = products.reduce((sum, item) => sum + item.stock, 0);

    return { outOfStock, lowStock, totalStock };
  }, [products]);
  const categoryBannerImage = categoryBannerImages[category];
  const openCategoryBannerPreview = () => {
    if (!categoryBannerImage) {
      return;
    }

    setPreviewBanner({ imageUrl: categoryBannerImage, title: getCategoryLabel(category) });
  };

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query.trim());

    return products.filter((item) => {
      const itemStatus = getStatus(item);
      const matchesText =
        query.trim().length === 0 || normalizeSearchText(item.name).includes(normalizedQuery);
      const matchesCategory =
        category === "ทั้งหมด" ||
        (category === dryFoodCategory
          ? matchesDryFoodSubcategory(item, dryFoodSubcategory)
          : category === beverageCategory
            ? item.category === beverageCategory && matchesBeverageSubcategory(item, beverageSubcategory)
            : category === supplementCategory
              ? item.category === supplementCategory && matchesSupplementSubcategory(item, supplementSubcategory)
              : category === healthBeautyCategory
                ? item.category === healthBeautyCategory && matchesHealthBeautySubcategory(item, healthBeautySubcategory)
                : category === firstAidCategory
                  ? item.category === firstAidCategory && matchesFirstAidSubcategory(item, firstAidSubcategory)
                  : category === medicineCategory
                  ? item.category === medicineCategory && matchesMedicineSubcategory(item, medicineSubcategory)
                  : category === alcoholCategory
                    ? item.category === alcoholCategory && matchesAlcoholSubcategory(item, alcoholSubcategory)
                    : category === petCategory
                      ? item.category === petCategory && matchesPetSubcategory(item, petSubcategory)
                      : category === herbalDrinkCategory
                        ? item.category === herbalDrinkCategory && matchesHerbalDrinkSubcategory(item, herbalDrinkSubcategory)
                        : category === instantNoodleCategory
                          ? item.category === instantNoodleCategory && matchesInstantNoodleSubcategory(item, instantNoodleSubcategory)
                          : category === candyCategory
                            ? item.category === candyCategory && matchesCandySubcategory(item, candySubcategory)
                            : category === meatCategory
                              ? item.category === meatCategory && matchesMeatSubcategory(item, meatSubcategory)
                              : category === eggCategory
                                ? item.category === eggCategory && matchesEggSubcategory(item, eggSubcategory)
                                : category === householdCategory
                                  ? item.category === householdCategory && matchesHouseholdSubcategory(item, householdSubcategory)
                                  : category === personalCareCategory
                                    ? item.category === personalCareCategory && matchesPersonalCareSubcategory(item, personalCareSubcategory)
                                    : category === milkCategory
                                      ? item.category === milkCategory && matchesMilkSubcategory(item, milkSubcategory)
                                      : item.category === category);
      const matchesStatus = status === "ทั้งหมด" || itemStatus === status;

      return matchesText && matchesCategory && matchesStatus;
    }).sort(sortProducts);
  }, [alcoholSubcategory, beverageSubcategory, candySubcategory, category, dryFoodSubcategory, eggSubcategory, firstAidSubcategory, healthBeautySubcategory, herbalDrinkSubcategory, householdSubcategory, instantNoodleSubcategory, meatSubcategory, medicineSubcategory, milkSubcategory, personalCareSubcategory, petSubcategory, products, query, status, supplementSubcategory]);

  function commitSearchHistory(value: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return;
    }

    setSearchHistory((currentHistory) => [
      trimmedValue,
      ...currentHistory.filter((historyItem) => historyItem !== trimmedValue)
    ].slice(0, 8));
  }

  const uploadProps: UploadProps = {
    accept: "image/*",
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      const reader = new FileReader();

      reader.onload = () => {
        setImageUrl(String(reader.result));
      };

      reader.readAsDataURL(file);

      return false;
    }
  };

  const shopImageUploadProps: UploadProps = {
    accept: "image/*",
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      const reader = new FileReader();

      reader.onload = () => {
        setShopImageUrl(String(reader.result));
      };

      reader.readAsDataURL(file);

      return false;
    }
  };

  function closeAddModal() {
    setIsAddOpen(false);
    setImageUrl("");
    form.resetFields();
  }

  function handleLogin(values: { username: string; password: string }) {
    const account = staffAccounts.find(
      (item) => item.username === values.username.trim() && item.password === values.password
    );

    if (!account) {
      message.error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    setStaffName(account.displayName);
    window.localStorage.setItem(authStorageKey, account.displayName);
    setIsLoginOpen(false);
    loginForm.resetFields();
    message.success(`เข้าสู่ระบบในชื่อ ${account.displayName}`);
  }

  function handleLogout() {
    setStaffName(null);
    window.localStorage.removeItem(authStorageKey);
    setIsAddOpen(false);
    message.success("ออกจากระบบแล้ว");
  }

  function addProduct(values: ProductFormValues) {
    const nextProduct: Product = {
      id: Date.now(),
      ...values,
      category: normalizeCategory(values.category),
      imageUrl
    };

    setProducts((currentProducts) => [nextProduct, ...currentProducts]);
    setCategory("ทั้งหมด");
    setStatus("ทั้งหมด");
    closeAddModal();
  }

  function selectCategory(nextCategory: string) {
    setCategory(nextCategory);

    if (nextCategory !== dryFoodCategory) {
      setDryFoodSubcategory("ทั้งหมด");
    }

    if (nextCategory !== beverageCategory) {
      setBeverageSubcategory("ทั้งหมด");
    }

    if (nextCategory !== healthBeautyCategory) {
      setHealthBeautySubcategory("ทั้งหมด");
    }

    if (nextCategory !== medicineCategory) {
      setMedicineSubcategory("ทั้งหมด");
    }

    if (nextCategory !== firstAidCategory) {
      setFirstAidSubcategory("ทั้งหมด");
    }

    if (nextCategory !== householdCategory) {
      setHouseholdSubcategory("ทั้งหมด");
    }

    if (nextCategory !== personalCareCategory) {
      setPersonalCareSubcategory("ทั้งหมด");
    }

    if (nextCategory !== milkCategory) {
      setMilkSubcategory("ทั้งหมด");
    }

    if (nextCategory !== alcoholCategory) {
      setAlcoholSubcategory("ทั้งหมด");
    }

    if (nextCategory !== petCategory) {
      setPetSubcategory("ทั้งหมด");
    }

    if (nextCategory !== herbalDrinkCategory) {
      setHerbalDrinkSubcategory("ทั้งหมด");
    }

    if (nextCategory !== instantNoodleCategory) {
      setInstantNoodleSubcategory("ทั้งหมด");
    }

    if (nextCategory !== candyCategory) {
      setCandySubcategory("ทั้งหมด");
    }

    if (nextCategory !== meatCategory) {
      setMeatSubcategory("ทั้งหมด");
    }

    if (nextCategory !== eggCategory) {
      setEggSubcategory("ทั้งหมด");
    }
  }

  function scrollCategories(direction: "left" | "right") {
    categoryRowRef.current?.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -240 : 240
    });
  }

  function renderSubcategoryScroller<T extends string>(
    label: string,
    items: readonly T[],
    activeItem: T,
    setActiveItem: (item: T) => void,
    iconMap?: Record<string, string>
  ) {
    return (
      <div className="subcategory-row" aria-label={label}>
        {items.map((item) => {
          const subcategoryIcon = iconMap?.[item];

          return (
            <Button
              className={`subcategory-chip${subcategoryIcon ? " has-icon" : ""}`}
              key={item}
              type={activeItem === item ? "primary" : "default"}
              onClick={() => setActiveItem(item)}
            >
              {subcategoryIcon ? (
                <NextImage
                  className="subcategory-chip-icon"
                  src={subcategoryIcon}
                  alt=""
                  width={22}
                  height={22}
                  loading="eager"
                />
              ) : null}
              {item}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <main className="shop-app">
      <div className="shop-shell">
        <header className="topbar">
          <div className="brand-row">
            <Space size={10}>
              {isStaff ? (
                <Upload {...shopImageUploadProps}>
                  <button className={`brand-mark${shopImageUrl ? " has-image" : ""}`} type="button" aria-label="เลือกรูปร้าน">
                    {shopImageUrl ? (
                      <NextImage alt="รูปร้าน Fang Fang Shop" className="brand-mark-image" fill sizes="42px" src={shopImageUrl} />
                    ) : (
                      <CatMark />
                    )}
                    <span className="brand-mark-edit" aria-hidden="true">
                      <EditOutlined />
                    </span>
                  </button>
                </Upload>
              ) : (
                <div className={`brand-mark${shopImageUrl ? " has-image" : ""}`} aria-hidden="true">
                  {shopImageUrl ? (
                    <NextImage alt="รูปร้าน Fang Fang Shop" className="brand-mark-image" fill sizes="42px" src={shopImageUrl} />
                  ) : (
                    <CatMark />
                  )}
                </div>
              )}
              <div className="brand-text">
                <h1>Fang Fang Shop</h1>
                <p>{isStaff ? `พนักงาน: ${staffName}` : "รายการสินค้าและราคาในร้าน"}</p>
              </div>
            </Space>

            <div className="header-actions">
              {isStaff ? (
                <>
                  <Badge count={summary.lowStock + summary.outOfStock} size="small">
                    <Button aria-label="แจ้งเตือนสินค้า" icon={<BellOutlined />} />
                  </Badge>
                  <Button
                    aria-label="เพิ่มสินค้า"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsAddOpen(true)}
                  />
                  <Button aria-label="ออกจากระบบ" icon={<LogoutOutlined />} onClick={handleLogout} />
                </>
              ) : (
                <Button type="primary" icon={<LoginOutlined />} onClick={() => setIsLoginOpen(true)}>
                  พนักงานเข้าสู่ระบบ
                </Button>
              )}
            </div>
          </div>
        </header>

        {isStaff ? (
          <>
            <section className="hero-band" aria-label="ภาพรวมร้าน">
              <div className="stat-grid">
                <div className="stat-box">
                  <span className="stat-number">{products.length}</span>
                  <span className="tiny-text">รายการสินค้า</span>
                </div>
                <div className="stat-box stat-box-warning">
                  <span className="stat-number">{summary.lowStock}</span>
                  <span className="tiny-text">ใกล้หมด</span>
                </div>
                <div className="stat-box stat-box-danger">
                  <span className="stat-number">{summary.outOfStock}</span>
                  <span className="tiny-text">สินค้าหมด</span>
                </div>
              </div>
            </section>

            <section className="quick-tools" aria-label="เครื่องมือร้าน">
              <Button className="tool-button" icon={<PlusOutlined />} type="primary" onClick={() => setIsAddOpen(true)}>
                รับของเข้า
              </Button>
              <Button className="tool-button" icon={<EditOutlined />}>
                ปรับสต็อก
              </Button>
              <Button className="tool-button" icon={<ReloadOutlined />}>
                เช็กรอบวัน
              </Button>
              <Button className="tool-button" icon={<TeamOutlined />}>
                พนักงาน
              </Button>
            </section>
          </>
        ) : null}

        <section className="filters" aria-label="ค้นหาสินค้า">
          <div className="search-box">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="ค้นหาสินค้า"
              size="large"
              value={query}
              onBlur={() => commitSearchHistory(query)}
              onChange={(event) => setQuery(event.target.value)}
              onPressEnter={() => commitSearchHistory(query)}
            />
            {searchHistory.length > 0 ? (
              <div className="search-history" aria-label="ประวัติการค้นหา">
                <span className="search-history-label">ล่าสุด</span>
                {searchHistory.map((historyItem) => (
                  <Button
                    className="search-history-chip"
                    key={historyItem}
                    size="small"
                    type={query === historyItem ? "primary" : "default"}
                    onClick={() => {
                      setQuery(historyItem);
                      commitSearchHistory(historyItem);
                    }}
                  >
                    {historyItem}
                  </Button>
                ))}
                <Button
                  className="clear-history-button"
                  size="small"
                  type="text"
                  onClick={() => setSearchHistory([])}
                >
                  ล้าง
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        <div className="category-scroller">
          <Button
            aria-label="เลื่อนหมวดหมู่ไปทางซ้าย"
            className="category-scroll-button"
            icon={<LeftOutlined />}
            onClick={() => scrollCategories("left")}
          />
          <div className="category-row" aria-label="หมวดหมู่สินค้า" ref={categoryRowRef}>
            {categories.map((item) => {
              const categoryIcon = categoryIconImages[item];

              return (
                <Button
                  className={`category-chip${categoryIcon ? " has-icon" : ""}`}
                  key={item}
                  type={category === item ? "primary" : "default"}
                  onClick={() => selectCategory(item)}
                >
                  {categoryIcon ? (
                    <NextImage
                      className="category-chip-icon"
                      src={categoryIcon}
                      alt=""
                      width={22}
                      height={22}
                      loading="eager"
                    />
                  ) : null}
                  {getCategoryLabel(item)}
                </Button>
              );
            })}
          </div>
          <Button
            aria-label="เลื่อนหมวดหมู่ไปทางขวา"
            className="category-scroll-button"
            icon={<RightOutlined />}
            onClick={() => scrollCategories("right")}
          />
        </div>

        {category !== "ทั้งหมด" ? (
          <section
            className={`category-banner${categoryBannerImage ? " has-image is-clickable" : ""}`}
            aria-label={`แบนเนอร์หมวด ${category}`}
            role={categoryBannerImage ? "button" : undefined}
            tabIndex={categoryBannerImage ? 0 : undefined}
            onClick={categoryBannerImage ? openCategoryBannerPreview : undefined}
            onKeyDown={
              categoryBannerImage
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openCategoryBannerPreview();
                    }
                  }
                : undefined
            }
          >
            {categoryBannerImage ? (
              <NextImage className="category-banner-image" src={categoryBannerImage} alt="" fill sizes="100vw" priority />
            ) : null}
            <div className="category-banner-pill">{getCategoryLabel(category)}</div>
            {!categoryBannerImage ? (
              <div className="category-banner-placeholder" aria-hidden="true">
                <PictureOutlined />
              </div>
            ) : null}
          </section>
        ) : null}

        {category === dryFoodCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยอาหารแห้ง", dryFoodSubcategories, dryFoodSubcategory, setDryFoodSubcategory, dryFoodSubcategoryIcons)
        ) : null}

        {category === beverageCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยเครื่องดื่ม", beverageSubcategories, beverageSubcategory, setBeverageSubcategory)
        ) : null}

        {category === supplementCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยอาหารเสริมและเวชสำอาง", supplementSubcategories, supplementSubcategory, setSupplementSubcategory)
        ) : null}

        {category === healthBeautyCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยสุขภาพและสวย", healthBeautySubcategories, healthBeautySubcategory, setHealthBeautySubcategory)
        ) : null}

        {category === medicineCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยยาสามัญประจำบ้าน", medicineSubcategories, medicineSubcategory, setMedicineSubcategory)
        ) : null}

        {category === firstAidCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยปฐมพยาบาล", firstAidSubcategories, firstAidSubcategory, setFirstAidSubcategory)
        ) : null}

        {category === householdCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยของใช้ในบ้าน", householdSubcategories, householdSubcategory, setHouseholdSubcategory)
        ) : null}

        {category === personalCareCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยของใช้ส่วนตัว", personalCareSubcategories, personalCareSubcategory, setPersonalCareSubcategory)
        ) : null}

        {category === milkCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยนม/โยเกิร์ต", milkSubcategories, milkSubcategory, setMilkSubcategory)
        ) : null}

        {category === alcoholCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยเครื่องดื่มแอลกอฮอล์", alcoholSubcategories, alcoholSubcategory, setAlcoholSubcategory)
        ) : null}

        {category === petCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยสินค้าสัตว์เลี้ยง", petSubcategories, petSubcategory, setPetSubcategory)
        ) : null}

        {category === herbalDrinkCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยน้ำสมุนไพรโฮมเมด", herbalDrinkSubcategories, herbalDrinkSubcategory, setHerbalDrinkSubcategory)
        ) : null}

        {category === instantNoodleCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยบะหมี่กึ่งสำเร็จรูป", instantNoodleSubcategories, instantNoodleSubcategory, setInstantNoodleSubcategory)
        ) : null}

        {category === candyCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยลูกอมและหมากฝรั่ง", candySubcategories, candySubcategory, setCandySubcategory)
        ) : null}

        {category === meatCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยเนื้อสัตว์", meatSubcategories, meatSubcategory, setMeatSubcategory)
        ) : null}

        {category === eggCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยไข่", eggSubcategories, eggSubcategory, setEggSubcategory)
        ) : null}

        <section>
          <div className="section-head">
            <div>
              <Typography.Title level={2}>
                <span className="title-paw">
                  <PawMark size={18} />
                </span>
                สินค้าในร้าน
              </Typography.Title>
              <p>ดูราคา จำนวนคงเหลือ และสถานะสินค้า</p>
            </div>
            <div className="status-tabs" role="group" aria-label="กรองสถานะสินค้าแบบเร็ว">
              {(["ทั้งหมด", "ใกล้หมด", "หมด"] as const).map((item) => (
                <Button
                  className="status-tab"
                  key={item}
                  type={status === item ? "primary" : "default"}
                  onClick={() => setStatus(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>

          <div className="product-list">
            {filteredProducts.map((item) => {
              const itemStatus = getStatus(item);
              const style = statusStyle(itemStatus);
              const percent = Math.min(100, Math.round((item.stock / Math.max(item.minStock * 2, 1)) * 100));

              return (
                <Card
                  className={`product-card ${item.isPlaceholder ? "" : "product-card-clickable"} ${
                    !item.isPlaceholder && itemStatus === "หมด" ? "product-card-sold-out" : ""
                  }`}
                  key={getProductKey(item)}
                  onClick={() => {
                    if (!item.isPlaceholder) {
                      setSelectedProduct(item);
                    }
                  }}
                >
                  {!item.isPlaceholder && itemStatus === "หมด" ? <span className="sold-out-stamp">หมด</span> : null}
                  <div className="product-main">
                    <div className="product-title-row">
                      {item.imageUrl ? (
                        <Image
                          alt={item.name}
                          className="product-image"
                          height={58}
                          preview={false}
                          src={item.imageUrl}
                          width={58}
                        />
                      ) : (
                        <div className="product-image product-image-empty">
                          <PictureOutlined />
                        </div>
                      )}
                      <div className="product-title">
                        <div className="product-name-row">
                          <Typography.Title level={3}>{item.name}</Typography.Title>
                          {item.category === "เลย์" ? (
                            <span className={`price-badge ${getPriceBadgeClass(item)}`}>{item.price} บาท</span>
                          ) : null}
                          {item.isPlaceholder ? <span className="placeholder-badge">หัวข้อ</span> : null}
                        </div>
                        <p className="product-detail">
                          {item.isPlaceholder
                            ? getProductCategoryLabel(item)
                            : `${getProductCategoryLabel(item)} · ${item.sizeLabel ?? item.unit}`}
                        </p>
                      </div>
                    </div>
                    {item.isPlaceholder ? (
                      <Tag color="processing">รอเติมสินค้า</Tag>
                    ) : (
                      <Tag color={style.color} icon={style.icon}>
                        {itemStatus}
                      </Tag>
                    )}
                  </div>

                  {item.isPlaceholder ? null : (
                    <Progress
                      percent={percent}
                      showInfo={false}
                      status={itemStatus === "หมด" ? "exception" : itemStatus === "ใกล้หมด" ? "active" : "success"}
                    />
                  )}

                  <div className="product-meta">
                    <div className="price-summary">
                      <span className="tiny-text">ราคา</span>
                      <span className="product-price">
                        {item.isPlaceholder ? "-" : item.price === 0 ? "รอราคา" : `฿${item.price}`}
                      </span>
                    </div>
                    <div className="stock-summary">
                      <span className="stock-count">{item.isPlaceholder ? "-" : item.stock}</span>
                      <span className="tiny-text">
                        {item.isPlaceholder
                          ? "ค่อยเพิ่มสินค้าในหัวข้อนี้"
                          : isStaff
                            ? `${item.unit} · ขั้นต่ำ ${item.minStock}`
                            : item.unit}
                      </span>
                    </div>
                    {isStaff ? (
                      <Space>
                        <Tag>{item.updatedBy}</Tag>
                        <Button
                          aria-label={`แก้ไข ${item.name}`}
                          icon={<EditOutlined />}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </Space>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-cat">
              <div className="empty-cat-face">
                <CatMark size={64} />
              </div>
              <p>ไม่พบสินค้าที่ตรงกับตัวกรอง</p>
            </div>
          ) : null}
        </section>
      </div>

      <nav className="bottom-tabs" aria-label="เมนูหลัก">
        <Button className="tab-button" type="primary" icon={<HomeOutlined />}>
          หน้าร้าน
        </Button>
        <Button className="tab-button" icon={<ShoppingOutlined />}>
          สินค้า
        </Button>
        {isStaff ? (
          <Button className="tab-button" icon={<InboxOutlined />}>
            สต็อก
          </Button>
        ) : null}
        <Button className="tab-button" icon={<AppstoreOutlined />}>
          หมวด
        </Button>
      </nav>

      <Modal
        centered
        className="category-image-preview-modal"
        footer={null}
        open={Boolean(previewBanner)}
        title={previewBanner?.title}
        width="min(960px, calc(100vw - 28px))"
        onCancel={() => setPreviewBanner(null)}
      >
        {previewBanner ? (
          <div className="category-preview-frame">
            <NextImage
              alt={previewBanner.title}
              className="category-preview-image"
              height={500}
              sizes="(max-width: 768px) 96vw, 960px"
              src={previewBanner.imageUrl}
              width={1600}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        centered
        className="product-preview-modal"
        footer={null}
        open={Boolean(selectedProduct)}
        title={null}
        onCancel={() => setSelectedProduct(null)}
      >
        {selectedProduct ? (
          <div className="product-preview">
            {selectedProduct.imageUrl ? (
              <Image
                alt={selectedProduct.name}
                className="product-preview-image"
                preview={false}
                src={selectedProduct.imageUrl}
              />
            ) : (
              <div className="product-preview-image product-preview-image-empty">
                <PictureOutlined />
              </div>
            )}
            <Tag color={statusStyle(getStatus(selectedProduct)).color} icon={statusStyle(getStatus(selectedProduct)).icon}>
              {getStatus(selectedProduct)}
            </Tag>
            {getStatus(selectedProduct) === "หมด" ? <div className="product-preview-sold-out">หมด</div> : null}
            <Typography.Title className="product-preview-name" level={2}>
              {selectedProduct.name}
            </Typography.Title>
            <div className="product-preview-price">
              {selectedProduct.price === 0 ? "รอราคา" : `฿${selectedProduct.price}`}
            </div>
            <p className="product-preview-detail">
              {getProductCategoryLabel(selectedProduct)} · {selectedProduct.sizeLabel ?? selectedProduct.unit}
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        centered
        destroyOnHidden
        okText="บันทึกสินค้า"
        open={isAddOpen}
        title="เพิ่มสินค้าใหม่"
        onCancel={closeAddModal}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            category: "อื่น ๆ",
            minStock: 5,
            stock: 1,
            unit: "ชิ้น",
            updatedBy: "เจ้าของร้าน"
          }}
          onFinish={addProduct}
        >
          <div className="image-uploader">
            {imageUrl ? (
              <Image alt="รูปสินค้าใหม่" className="upload-preview" preview={false} src={imageUrl} />
            ) : (
              <div className="upload-placeholder">
                <PictureOutlined />
              </div>
            )}
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>เลือกรูปสินค้า</Button>
            </Upload>
          </div>

          <Form.Item label="ชื่อสินค้า" name="name" rules={[{ required: true, message: "กรอกชื่อสินค้าก่อน" }]}>
            <Input placeholder="เช่น น้ำอัดลมกระป๋อง" />
          </Form.Item>

          <Form.Item label="หมวดหมู่" name="category" rules={[{ required: true, message: "เลือกหรือกรอกหมวดหมู่" }]}>
            <Select
              showSearch
              options={defaultCategories.map((item) => ({ label: getCategoryLabel(item), value: item }))}
              placeholder="เลือกหมวดหมู่"
            />
          </Form.Item>

          <div className="form-grid">
            <Form.Item label="ราคา (บาท)" name="price" rules={[{ required: true, message: "กรอกราคา" }]}>
              <InputNumber min={0} precision={0} />
            </Form.Item>
            <Form.Item label="จำนวน" name="stock" rules={[{ required: true, message: "กรอกจำนวน" }]}>
              <InputNumber min={0} precision={0} />
            </Form.Item>
          </div>

          <div className="form-grid">
            <Form.Item label="หน่วย" name="unit" rules={[{ required: true, message: "กรอกหน่วย" }]}>
              <Input placeholder="ชิ้น / ซอง / ขวด" />
            </Form.Item>
            <Form.Item label="ขั้นต่ำก่อนเตือน" name="minStock" rules={[{ required: true, message: "กรอกขั้นต่ำ" }]}>
              <InputNumber min={0} precision={0} />
            </Form.Item>
          </div>

          <Form.Item label="ผู้เพิ่มสินค้า" name="updatedBy">
            <Select
              options={[
                { label: "เจ้าของร้าน", value: "เจ้าของร้าน" },
                { label: "พนักงานขาย", value: "พนักงานขาย" }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        centered
        destroyOnHidden
        okText="เข้าสู่ระบบ"
        cancelText="ยกเลิก"
        open={isLoginOpen}
        title="พนักงานเข้าสู่ระบบ"
        onCancel={() => {
          setIsLoginOpen(false);
          loginForm.resetFields();
        }}
        onOk={() => loginForm.submit()}
      >
        <div className="login-cat">
          <CatMark size={56} />
        </div>
        <p className="login-hint">เข้าสู่ระบบเพื่อจัดการสต็อกและเพิ่มสินค้า (สำหรับพนักงานเท่านั้น)</p>
        <Form form={loginForm} layout="vertical" onFinish={handleLogin}>
          <Form.Item label="ชื่อผู้ใช้" name="username" rules={[{ required: true, message: "กรอกชื่อผู้ใช้" }]}>
            <Input prefix={<UserOutlined />} placeholder="ชื่อผู้ใช้" autoComplete="username" />
          </Form.Item>
          <Form.Item label="รหัสผ่าน" name="password" rules={[{ required: true, message: "กรอกรหัสผ่าน" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="รหัสผ่าน" autoComplete="current-password" onPressEnter={() => loginForm.submit()} />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}
