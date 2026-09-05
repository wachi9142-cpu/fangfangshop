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
import {
  changePassword as apiChangePassword,
  createProduct as apiCreateProduct,
  fetchMe as apiFetchMe,
  fetchProducts as apiFetchProducts,
  fetchUsers as apiFetchUsers,
  login as apiLogin,
  logout as apiLogout,
  updateMe as apiUpdateMe,
  updateProduct as apiUpdateProduct,
  uploadImage as apiUploadImage,
  clearToken,
  getToken,
  resolveImageUrl,
  setToken,
  type ApiUser
} from "./api";
import { avatarPresets, presetAvatarValue, presetPrefix, renderPresetAvatar } from "./avatars";
import { compressImage, fileToDataUrl } from "./image-utils";
import { avatarStorageKey, productImagePrefix, readAllImages, writeImage } from "./local-images";
import { migrateLocalImages } from "./migrate-images";

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
// เวอร์ชันของ catalog ในโค้ด — เมื่อแก้รายการสินค้าครั้งใหญ่ให้บวมเลขนี้
// ถ้าเวอร์ชันใน localStorage ไม่ตรง จะล้างข้อมูลเก่าทิ้งแล้วใช้ catalog ใหม่ (กันสินค้าซ้ำ/ค้าง)
const productsDataVersionKey = "fangfangshop-products-version";
const productsDataVersion = "2026-07-30-catalog-17";
const searchHistoryStorageKey = "fangfangshop-search-history";
const shopImageStorageKey = "fangfangshop-shop-image";
const defaultShopImageUrl = "/shop-images/fangfang-shop.png";
const authStorageKey = "fangfangshop-auth";

// การล็อกอินย้ายไปตรวจสอบที่ backend แล้ว (POST /auth/login ดู app/api.ts)
// บัญชีเริ่มต้น owner/1234, staff/1234 อยู่ในตาราง users ของ backend
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
  "ยาแก้ตัวร้อน ตราเขากวาง": "ยาแก้ท้องเสีย ตราเขากวาง",
  "ยาหม่องเสลดพังพอน ตราหมอเอี้ยง": "ยาอมมายบาซิน รสมินต์ (Mybacin Throat)",
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
  "ยาแก้ท้องเสีย ตราเขากวาง": "/product-images/medicine/kaokwang-fever.png",
  "ยาหอม ตรา 5 เจดีย์": "/product-images/medicine/yahom-5-chedi.png",
  "ขมิ้นชัน แคปซูล ตราอภัยภูเบศร": "/product-images/medicine/turmeric-abhaibhubejhr.png",
  "วิกส์ วาโปรับ (Vicks VapoRub)": "/product-images/medicine/vicks-vaporub.png",
  "ยาหม่องตราเสือ (Tiger Balm HR)": "/product-images/medicine/tiger-balm-hr.png",
  ยาหม่องตราวังว่าน: "/product-images/medicine/wangwan-balm.png",
  "ยาอมมายบาซิน รสมินต์ (Mybacin Throat)": "/product-images/medicine/mybacin-throat.png",
  "ยาหม่องไพล (Compound Phlai Balm)": "/product-images/medicine/phlai-balm-mor-iang.png",
  "คาเนสเทน ยาครีมฆ่าเชื้อรา (Canesten)": "/product-images/medicine/canesten.png",
  "ยาน้ำเขากุ้ย (Kao-Kui Water)": "/product-images/medicine/kao-kui-water.png",
  น้ำมันโอสถทิพย์: "/product-images/medicine/osotthip-green-oil.png",
  ยาดมเป๊ปเปอร์มินท์ฟิลด์: "/product-images/medicine/peppermint-field-inhaler.png",
  "ยาดมตราถ้วยทอง กลิ่นเลมอน": "/product-images/medicine/thuai-thong-lemon-inhaler.png",
  "ยาดมสมุนไพร ตราวังว่าน": "/product-images/medicine/wangwan-herbal-inhaler.png",
  "ยาดมโป๊ยเซียน มาร์คทู": "/product-images/medicine/poy-sian-inhaler.png",
  "ยาดมแบบขวด ขวดแดง": "/product-images/medicine/red-inhaler-bottle.png",
  "น้ำมันมวย ตรานำมวย": "/product-images/medicine/muay-cream.png",
  // ยาเม็ด/ยาน้ำ เพิ่มใหม่
  "ไทลินอล พาราเซตามอล 500 มก.": "/product-images/medicine/tylenol-500.png",
  "พาราเซตามอล พาราแคป 500 มก.": "/product-images/medicine/paracap-500.png",
  "พาราเซตามอล เซมอล 500 มก.": "/product-images/medicine/cemol-500.png",
  "ทิฟฟี่ ไซรัป (Tiffy)": "/product-images/medicine/tiffy-syrup.png",
  "สเตร็ปซิล ฮันนี่&เลมอน (Strepsils)": "/product-images/medicine/strepsils-honey-lemon.png",
  ยาอมมะแว้ง: "/product-images/medicine/mawaeng-lozenge.png",
  "ยาอมมายบาซิน โอทีซี เลมอน (Mybacin OTC)": "/product-images/medicine/mybacin-otc-lemon.png",
  "อัลเลอร์นิค เซทิริซีน (Allernix)": "/product-images/medicine/allernix.png",
  "เคาน์เตอร์เพน (Counterpain)": "/product-images/medicine/counterpain.png",
  "เคาน์เตอร์เพน คูล (Counterpain Cool)": "/product-images/medicine/counterpain-cool.png",
  "ซาลอนพาส แผ่นแปะ (Salonpas)": "/product-images/medicine/salonpas.png",
  "ผงถ่าน มายคาร์บอน (Activated Charcoal)": "/product-images/medicine/mycarbon-charcoal.png",
  "ผงถ่าน คาร์บอน (Activated Charcoal)": "/product-images/medicine/carbon-charcoal-caps.png",
  // ดูแลช่องปาก
  "ศิริราช น้ำยาบ้วนปาก (สีชมพู)": "/product-images/oral-care/siriraj-mouthwash-pink.png",
  "ศิริราช น้ำยาบ้วนปาก รสมิ้นต์ (สีเขียว)": "/product-images/oral-care/siriraj-mouthwash-mint.png",
  "ยาสีฟัน Colgate ผสมสมุนไพร": "/product-images/oral-care/colgate-herbal-blue.png",
  "ยาสีฟัน Colgate สูตรสมุนไพร (กล่องเขียว)": "/product-images/oral-care/colgate-herbal-green.png",
  "ยาสีฟันสมุนไพร ตราหมอจุฬา": "/product-images/oral-care/mochula-toothpaste.png",
  "ยาสีฟันสมุนไพร เทพไทย": "/product-images/oral-care/tepthai-toothpaste.png",
  "ยาสีฟันสมุนไพร เทพไทย รสมิกซ์ฟรุ๊ต": "/product-images/oral-care/tepthai-mixed-fruit.png",
  "น้ำยาบ้วนปาก Colgate Plax": "/product-images/oral-care/colgate-plax-mouthwash.png",
  "น้ำยาบ้วนปาก Listerine Kids": "/product-images/oral-care/listerine-kids.png",
  "น้ำยาบ้วนปาก Listerine Total Care": "/product-images/oral-care/listerine-total-care.png",
  "น้ำยาบ้วนปาก Mybacin สูตรฟลูออไรด์": "/product-images/oral-care/mybacin-fluoride.png",
  "น้ำยาบ้วนปาก Mybacin สูตรออริจินัล": "/product-images/oral-care/mybacin-original.png",
  "น้ำยาบ้วนปาก Mybacin สูตรไวท์ โพรเทค": "/product-images/oral-care/mybacin-white.png",
  "น้ำยาบ้วนปาก Oral-B 3D White": "/product-images/oral-care/oralb-3dwhite.png",
  "น้ำยาบ้วนปาก MONDAHMIN Advanced Care (สีม่วง)": "/product-images/oral-care/mondahmin-advanced.png",
  "น้ำยาบ้วนปาก MONDAHMIN Freshmint (สีเขียว)": "/product-images/oral-care/mondahmin-freshmint.png",
  "ยาป้ายปาก คาโนโลน แผลในปาก (Kanolone)": "/product-images/oral-care/oral-paste-kanolone.png",
  "ยาป้ายปาก ไตรโนโลน แก้ร้อนใน (Trinolone)": "/product-images/oral-care/oral-paste-trinolone.png",
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
  "พิมเสนน้ำ ตราโป๊ยเซียน | แบบโรลออน": "/product-images/medicine/pimsen-poysian-rollon.png",
  "พิมเสนน้ำ ตราโป๊ยเซียน | แบบตลับ": "/product-images/medicine/pimsen-nam-poysian.png",
  "พิมเสนน้ำ ตราโป๊ยเซียน | แบบขวด": "/product-images/medicine/pimsen-nam-bottle.png",
  "ยาหม่องตราถ้วยทอง 2493 | กระปุก 50 กรัม": "/product-images/medicine/thuai-thong-balm-50g.png",
  "ยาหม่องตราถ้วยทอง 2493 | ตลับเล็ก 8 กรัม": "/product-images/medicine/thuai-thong-balm-8g.png",
  "ยาดมสมุนไพร ตราหงส์ไทย | สีเหลือง": "/product-images/medicine/hong-thai-yellow-herbal-inhaler.png",
  "ยาดมสมุนไพร ตราหงส์ไทย | สีเขียว": "/product-images/medicine/hong-thai-blue-herbal-inhaler.png"
};

// ชื่อสินค้าที่ "รูปต้องมาจาก productImageByKey เท่านั้น" (ชื่อซ้ำหลายแบบ) — แบบที่ไม่มีรูปให้เว้นว่าง
// hydrateProduct จะยึดค่านี้เป็นหลัก ล้างรูปเก่าที่ค้างใน localStorage ทิ้ง
const perVariantOnlyNames = new Set<string>(["พิมเสนน้ำ ตราโป๊ยเซียน", "ยาหม่องตราถ้วยทอง 2493", "ยาดมสมุนไพร ตราหงส์ไทย"]);

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

// นม/โยเกิร์ต — หัวข้อย่อยคัดจากชื่อสินค้า (ดู matchesMilkSubcategory)
// นม / โยเกิร์ต / นมถั่วเหลือง-น้ำเต้าหู้ / นมเปรี้ยว
const milkProducts: Product[] = ([
  { name: "นมไวตามินขวด", unit: "ขวด", price: 17 },

  // --- นม ---
  { name: "นมไทย-เดนมาร์ค ยูเอชที รสจืด", unit: "กล่อง", sizeLabel: "180 มล.", image: "thai-denmark-plain-180.png" },
  { name: "โอวัลติน นมช็อกโกแลตมอลต์ ยูเอชที", unit: "กล่อง", image: "ovaltine-uht.png" },
  { name: "โอวัลติน สมาร์ท นมช็อกโกแลตมอลต์", unit: "กล่อง", image: "ovaltine-smart.png" },
  { name: "โฟร์โมสต์ นมโคสดแท้ 100% ไขมันต่ำ", unit: "กล่อง", image: "foremost-fresh-milk-100.png" },
  { name: "โฟร์โมสต์ นมรสหวานกลมกล่อม", unit: "กล่อง", image: "foremost-sweet.png" },
  { name: "โฟร์โมสต์ นมรสช็อกโกแลต", unit: "กล่อง", image: "foremost-chocolate.png" },
  { name: "โฟร์โมสต์ นมรสสตรอเบอร์รี่", unit: "กล่อง", image: "foremost-strawberry.png" },
  { name: "เนสท์เล่ แบร์แบรนด์ นมชมพู", unit: "กล่อง", image: "bearbrand-pink.png" },

  // --- โยเกิร์ตพร้อมดื่ม ---
  { name: "ดัชมิลล์ 4 อิน 1 นมเปรี้ยวพร้อมดื่ม รสบลูเบอร์รี่", unit: "กล่อง", image: "dutchmill-4in1-blueberry.png" },
  { name: "ดัชมิลล์ 4 อิน 1 นมเปรี้ยวพร้อมดื่ม รสสตรอเบอร์รี่", unit: "กล่อง", image: "dutchmill-4in1-strawberry.png" },
  { name: "ดัชมิลล์ 4 อิน 1 นมเปรี้ยวพร้อมดื่ม รสมิกซ์เบอร์รี่", unit: "กล่อง", image: "dutchmill-4in1-mixed-berries.png" },
  { name: "ดัชมิลล์ 4 อิน 1 นมเปรี้ยวพร้อมดื่ม รสส้ม", unit: "กล่อง", image: "dutchmill-4in1-orange.png" },
  { name: "ดัชมิลล์ 4 อิน 1 นมเปรี้ยวพร้อมดื่ม รสผลไม้รวม", unit: "กล่อง", image: "dutchmill-4in1-mixed-fruits.png" },

  // --- นมเปรี้ยว ---
  { name: "ยาคูลท์ นมเปรี้ยว", unit: "ขวด", sizeLabel: "80 มล.", image: "yakult-80.png" },
  { name: "ยาคูลท์ ไลท์ นมเปรี้ยว", unit: "ขวด", image: "yakult-light.png" },
  { name: "บีทาเก้น ไลท์ นมเปรี้ยว", unit: "ขวด", sizeLabel: "ไขมัน 0% แลคโตสฟรี", image: "betagen-light.png" },
  { name: "บีทาเก้น คอมบูฉะ ชาหมัก รสออริจินัล", unit: "ขวด", image: "betagen-kombucha-original.png" },

  // --- นมถั่วเหลือง / น้ำเต้าหู้ ---
  { name: "ไวตามิ้ลค์ สูตรออริจินัล ยูเอชที", unit: "กล่อง", image: "vitamilk-original-uht.png" },
  { name: "ไวตามิ้ลค์ สูตรข้าวบาร์เลย์และมอลต์", unit: "กล่อง", sizeLabel: "300 มล.", image: "vitamilk-barley-malt-300.png" },
  { name: "ไวตามิ้ลค์ สูตรเจ", unit: "กล่อง", sizeLabel: "250 มล.", image: "vitamilk-vegan-250.png" },
  { name: "ไวตามิ้ลค์ สูตรออริจินัล ขวดแก้ว", unit: "ขวด", image: "vitamilk-original-bottle.png" },
  { name: "ไวตามิ้ลค์ สูตรงาดำ ขวดแก้ว", unit: "ขวด", image: "vitamilk-black-sesame-bottle.png" },
  { name: "ไวตามิ้ลค์ สูตรชาไทย ขวดแก้ว", unit: "ขวด", image: "vitamilk-thai-tea-bottle.png" },
  { name: "แลคตาซอย ออริจินัล รสหวาน", unit: "กล่อง", sizeLabel: "300 มล.", image: "lactasoy-original-300.png" },
  { name: "ดีน่า สูตรงาดำ 2 เท่า", unit: "กล่อง", sizeLabel: "180 มล.", image: "dna-black-sesame-180.png" },
  { name: "ดีน่า Extra Black Sesame งาดำ ขวด", unit: "ขวด", image: "dna-extra-black-sesame-bottle.png" },
  { name: "ดีน่า แบล็ค ไฮโปรตีน", unit: "กล่อง", sizeLabel: "โปรตีนสูง 2 เท่า", image: "dna-black-high-protein.png" },
  { name: "ดีน่า กาบา จมูกข้าวญี่ปุ่น", unit: "กล่อง", image: "dna-gaba-box.png" },
  { name: "ดีน่า กาบา จมูกข้าวญี่ปุ่น สูตรน้ำตาลน้อย", unit: "กล่อง", sizeLabel: "230 มล.", image: "dna-gaba-less-sugar-230.png" },
  { name: "ดีน่า กาบา จมูกข้าวญี่ปุ่น ขวด", unit: "ขวด", image: "dna-gaba-bottle.png" },
  { name: "ดีน่า ไรซ์เบอร์รี่", unit: "กล่อง", sizeLabel: "วิตามิน 11 ชนิด", image: "dna-riceberry.png" },

  // --- โยเกิร์ตถ้วย: ดัชชี่ ---
  { name: "ดัชชี่ โยเกิร์ต รสออริจินัล", unit: "ถ้วย", image: "dutchie-original.png" },
  { name: "ดัชชี่ โยเกิร์ต รสสตรอเบอร์รี่", unit: "ถ้วย", image: "dutchie-strawberry.png" },
  { name: "ดัชชี่ โยเกิร์ต ผลไม้รวม", unit: "ถ้วย", image: "dutchie-mixed-fruit.png" },
  { name: "ดัชชี่ โยเกิร์ต วุ้นมะพร้าว", unit: "ถ้วย", image: "dutchie-nata-de-coco.png" },
  { name: "ดัชชี่ โยเกิร์ต ธัญพืช ถั่วแดง เม็ดบัว", unit: "ถ้วย", image: "dutchie-cereal-beans-lotus.png" },
  { name: "ดัชชี่ โยเกิร์ต สโนว์แพร์ & คาโมมายล์", unit: "ถ้วย", image: "dutchie-snow-pear-chamomile.png" },
  { name: "ดัชชี่ โยเกิร์ต 0% ไขมัน ไฮไฟเบอร์ รสธรรมชาติ", unit: "ถ้วย", image: "dutchie-0fat-natural.png" },
  { name: "ดัชชี่ โยเกิร์ต 0% ไขมัน ไฮไฟเบอร์ รสสตรอเบอร์รี่", unit: "ถ้วย", image: "dutchie-0fat-strawberry.png" },
  { name: "ดัชชี่ โยเกิร์ต โพรไบโอติก รสสตรอเบอร์รี่", unit: "ถ้วย", image: "dutchie-probiotic-strawberry.png" },
  { name: "ดัชชี่ คิดส์ โยเกิร์ต ผลไม้รวม", unit: "ถ้วย", image: "dutchie-kids-mixed-fruit.png" },
  { name: "ดัชชี่ คิดส์ โยเกิร์ต รสสตรอเบอร์รี่", unit: "ถ้วย", image: "dutchie-kids-strawberry.png" },
  { name: "ดัชชี่ กรีกสไตล์ โยเกิร์ต มิกซ์เบอร์รี่ พร้อมกราโนล่า", unit: "ถ้วย", sizeLabel: "โปรตีน 2 เท่า", image: "dutchie-greek-granola-berry.png" },
  { name: "ดัชชี่ กรีกสไตล์ โยเกิร์ต สตรอเบอร์รี่ & ไวท์ช็อกโกแลต พร้อมกราโนล่า", unit: "ถ้วย", sizeLabel: "โปรตีน 2 เท่า", image: "dutchie-greek-strawberry-white-choc.png" },

  // --- โยเกิร์ตถ้วย: เมจิ ---
  { name: "เมจิ โยเกิร์ต ผสมผลไม้รวม", unit: "ถ้วย", image: "meiji-mixed-fruit.png" },
  { name: "เมจิ โยเกิร์ต รสส้มมิคัง", unit: "ถ้วย", image: "meiji-mikan-orange.png" },
  { name: "เมจิ โยเกิร์ต โพรไบโอติก ผสมมะม่วง", unit: "ถ้วย", image: "meiji-probiotic-mango.png" },
  { name: "เมจิ โยเกิร์ต โพรไบโอติก ผสมสตรอเบอร์รี่", unit: "ถ้วย", image: "meiji-probiotic-strawberry.png" },
  { name: "เมจิ โยเกิร์ต โพรไบโอติก ผสมพีช", unit: "ถ้วย", image: "meiji-probiotic-peach.png" },
  { name: "เมจิ โยเกิร์ต โพรไบโอติก ผสมแอปเปิ้ลเขียว", unit: "ถ้วย", image: "meiji-probiotic-green-apple.png" },
  { name: "เมจิ โยเกิร์ต โพรไบโอติก ผสมองุ่น", unit: "ถ้วย", image: "meiji-probiotic-grape.png" },

  // --- โยเกิร์ตถ้วย: เมจิ บัลแกเรีย ---
  { name: "เมจิ บัลแกเรีย โยเกิร์ต รสธรรมชาติ", unit: "ถ้วย", image: "meiji-bulgaria-natural.png" },
  { name: "เมจิ บัลแกเรีย โยเกิร์ต 0% ไขมัน น้ำตาลน้อย", unit: "ถ้วย", image: "meiji-bulgaria-0fat.png" },
  { name: "เมจิ บัลแกเรีย เซ็ตโยเกิร์ต ผสมแอปเปิ้ล", unit: "ถ้วย", image: "meiji-bulgaria-set-apple.png" },
  { name: "เมจิ บัลแกเรีย เซ็ตโยเกิร์ต ผสมสตรอเบอร์รี่", unit: "ถ้วย", image: "meiji-bulgaria-set-strawberry.png" },
  { name: "เมจิ บัลแกเรีย เซ็ตโยเกิร์ต ผสมยูซุ ออเรนจ์", unit: "ถ้วย", image: "meiji-bulgaria-set-yuzu.png" },
  { name: "เมจิ บัลแกเรีย โยเกิร์ต โกลเด้นฮันนี่", unit: "ถ้วย", image: "meiji-bulgaria-golden-honey.png" },

  // --- โยเกิร์ตพร้อมดื่ม: เมจิ บัลแกเรีย ---
  { name: "เมจิ บัลแกเรีย โยเกิร์ตพร้อมดื่ม รสผลไม้รวม", unit: "ขวด", sizeLabel: "น้ำตาลน้อยลง 25%", image: "meiji-bulgaria-drink-mixed-fruit.png" },
  { name: "เมจิ บัลแกเรีย โยเกิร์ตพร้อมดื่ม รสแอปเปิ้ล", unit: "ขวด", sizeLabel: "0% ไขมัน", image: "meiji-bulgaria-drink-apple.png" },
  { name: "เมจิ บัลแกเรีย โยเกิร์ตพร้อมดื่ม รสไวลด์เบอร์รี่", unit: "ขวด", image: "meiji-bulgaria-drink-wildberry.png" },

  // --- โยเกิร์ตถ้วย: อื่น ๆ ---
  { name: "ริเชส โยเกิร์ต ผสมฟรุตสลัด", unit: "ถ้วย", sizeLabel: "น้ำตาลน้อยลง 39%", image: "richesse-fruitsalad.png" }
] as { name: string; unit?: string; sizeLabel?: string; price?: number; image?: string }[]).map(({ image, ...product }, index) => ({
  id: 9500 + index,
  category: "นม/โยเกิร์ต",
  stock: 20,
  minStock: 5,
  unit: "กล่อง",
  price: 0,
  updatedBy: "เจ้าของร้าน",
  ...product,
  imageUrl: image ? `/product-images/milk/${image}` : productImageByName[product.name]
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

const instantNoodleProducts: Product[] = ([
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
  { name: "ยำยำ ช้างน้อย รสซุปเปอร์เลมอน", unit: "ซอง", sizeLabel: "20 กรัม", image: "yumyum-chang-noi-super-lemon.png" },
  { name: "ยำยำ ช้างน้อย รสบาร์บีคิว", unit: "ซอง", sizeLabel: "20 กรัม", image: "yumyum-chang-noi-bbq.png" },
  { name: "ยำยำ ช้างน้อย รสข้าวโพด", unit: "ซอง", sizeLabel: "20 กรัม", image: "yumyum-chang-noi-corn.png" },
  { name: "ยำยำ ช้างน้อย รสต้มยำกุ้ง", unit: "ซอง", sizeLabel: "20 กรัม", image: "yumyum-chang-noi-tomyum.png" },
  { name: "ยำยำ ช้างน้อย รสโนริสาหร่าย", unit: "ซอง", sizeLabel: "20 กรัม", image: "yumyum-chang-noi-nori.png" },
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
] as { name: string; unit?: string; sizeLabel?: string; image?: string }[]).map(({ image, ...product }, index) => ({
  id: 10000 + index,
  category: "บะหมี่กึ่งสำเร็จรูป",
  stock: 20,
  minStock: 5,
  unit: "ซอง",
  price: 0,
  updatedBy: "เจ้าของร้าน",
  ...product,
  imageUrl: image ? `/product-images/snack/${image}` : productImageByName[product.name]
}));

// โรลออน อยู่หมวด "สุขภาพ/สวย" — เข้าหมวดย่อยผ่าน keyword "โรลออน"/"ระงับกลิ่นกาย"
const rollOnProducts: Product[] = [
  // วีไวต์
  { name: "วีไวต์ โรลออน Pleasure Floral", unit: "ขวด", image: "vivite-pleasure-floral.png" },
  { name: "วีไวต์ โรลออน Crystal White", unit: "ขวด", image: "vivite-crystal-white.png" },
  { name: "วีไวต์ โรลออน In Love Fresh", unit: "ขวด", image: "vivite-in-love-fresh.png" },
  { name: "วีไวต์ โรลออน Clear & Confident", unit: "ขวด", image: "vivite-clear-confident.png" },
  { name: "วีไวต์ โรลออน English Pear & Freesia", unit: "ขวด", image: "vivite-english-pear-freesia.png" },
  { name: "วีไวต์ โรลออน Mood Sense Joy", unit: "ขวด", image: "vivite-mood-sense-joy.png" },
  { name: "วีไวต์ โรลออน Super Vitamin Charming Aura", unit: "ขวด", image: "vivite-super-vitamin.png" },
  { name: "วีไวต์ โรลออน Glow Up", unit: "ขวด", image: "vivite-glow-up.png" },
  { name: "วีไวต์ โรลออน Snail White", unit: "ขวด", image: "vivite-snail-white.png" },
  { name: "วีไวต์ โรลออน Super Smooth Less Shave", unit: "ขวด", image: "vivite-super-smooth.png" },
  { name: "วีไวต์ โรลออน Sunny Fresh Bright & Firm", unit: "ขวด", image: "vivite-sunny-fresh.png" },

  // เอ็กซิท
  { name: "เอ็กซิท โรลออน Sport Fresh", unit: "ขวด", image: "exit-sport-fresh.png" },
  { name: "เอ็กซิท โรลออน Extra Protect", unit: "ขวด", sizeLabel: "45 มล.", image: "exit-extra-protect.png" },
  { name: "เอ็กซิท โรลออน Cool Active", unit: "ขวด", sizeLabel: "72 ชั่วโมง", image: "exit-cool-active.png" },
  { name: "เอ็กซิท โรลออน Tech Perfume", unit: "ขวด", sizeLabel: "72 ชั่วโมง", image: "exit-tech-perfume.png" },
  { name: "เอ็กซิท โรลออน Clear & Protect", unit: "ขวด", image: "exit-clear-protect.png" },
  { name: "เอ็กซิท โรลออน ON", unit: "ขวด", sizeLabel: "32.5 มล.", image: "exit-on.png" },
  { name: "เอ็กซิท โรลออน Style Perfume", unit: "ขวด", sizeLabel: "72 ชั่วโมง", image: "exit-style-perfume.png" },

  // นีเวีย
  { name: "นีเวีย เมน โรลออน Cool Kick Extra Dry", unit: "ขวด", image: "nivea-men-cool-kick.png" },
  { name: "นีเวีย เมน โรลออน Deep Extreme", unit: "ขวด", image: "nivea-men-deep-extreme.png" },
  { name: "นีเวีย เมน โรลออน Deep Darkwood", unit: "ขวด", image: "nivea-men-deep-darkwood.png" },
  { name: "นีเวีย เมน โรลออน Deep Espresso", unit: "ขวด", image: "nivea-men-deep-espresso.png" },
  { name: "นีเวีย โรลออน Pearl & Beauty", unit: "ขวด", sizeLabel: "50 มล.", image: "nivea-pearl-beauty.png" },

  // เภสัช
  { name: "เภสัช โรลออน Sky Fresh", unit: "ขวด", image: "bhaesaj-sky-fresh.png" },
  { name: "เภสัช โรลออน Purple Joy", unit: "ขวด", image: "bhaesaj-purple-joy.png" },
  { name: "เภสัช โรลออน Sweety Pink", unit: "ขวด", image: "bhaesaj-sweety-pink.png" },
  { name: "เภสัช โรลออน Lively Green", unit: "ขวด", image: "bhaesaj-lively-green.png" },

  // ทเวลฟ์ พลัส
  { name: "ทเวลฟ์ พลัส โรลออน Double White Sakura", unit: "ขวด", image: "twelve-plus-double-white-sakura.png" },
  { name: "ทเวลฟ์ พลัส โรลออน Less Shave Nourish", unit: "ขวด", image: "twelve-plus-less-shave-nourish.png" },
  { name: "ทเวลฟ์ พลัส โรลออน Firming & Reduce Wrinkle", unit: "ขวด", image: "twelve-plus-firming.png" },
  { name: "ทเวลฟ์ พลัส โรลออน Smooth Radiance", unit: "ขวด", image: "twelve-plus-smooth-radiance.png" },
  { name: "ทเวลฟ์ พลัส โรลออน Snow Bright", unit: "ขวด", image: "twelve-plus-snow-bright.png" },
  { name: "ทเวลฟ์ พลัส โรลออน Less Shave Renew", unit: "ขวด", image: "twelve-plus-less-shave-renew.png" },
  { name: "ทเวลฟ์ พลัส โรลออน Less Shave Snail Care", unit: "ขวด", image: "twelve-plus-less-shave-snail.png" },
  { name: "ทเวลฟ์ พลัส x เบบี้มายด์ โรลออน Organic Bright", unit: "ขวด", image: "twelve-plus-babi-mild-organic.png" },
  { name: "12 พลัส โรลออน นาโน คอลลาเจน", unit: "ขวด", sizeLabel: "24 ชั่วโมง", image: "twelve-plus-nano-collagen.png" },

  // เอเวอร์เซ้นส์
  { name: "เอเวอร์เซ้นส์ โรลออน โยเกิร์ต Red Love Apple", unit: "ขวด", image: "eversense-red-love-apple.png" },
  { name: "เอเวอร์เซ้นส์ โรลออน โยเกิร์ต เอ็กซ์ตร้าไวท์ (ส้ม)", unit: "ขวด", image: "eversense-extra-white-orange.png" },
  { name: "เอเวอร์เซ้นส์ โรลออน โยเกิร์ต เอ็กซ์ตร้าไวท์ (ชมพู)", unit: "ขวด", image: "eversense-extra-white-pink.png" },

  // เต่าเหยียบโลก
  { name: "เต่าเหยียบโลก โรลออน Pomegranate Smooth & Clear", unit: "ขวด", image: "taoyeablok-pomegranate.png" },
  { name: "เต่าเหยียบโลก โรลออน Heart Pea Natural Fresh & Firm", unit: "ขวด", image: "taoyeablok-heart-pea.png" },

  // อื่น ๆ
  { name: "ท็อป คันทรี่ โรลออน Anti-Perspirant", unit: "ขวด", sizeLabel: "60 มล.", image: "top-country.png" },
  { name: "Simple โรลออน Gentle Care", unit: "ขวด", sizeLabel: "48 ชั่วโมง", image: "simple-gentle-care.png" },
  { name: "เบบี้มายด์ Ultra Mild Deo โรลออน Organic", unit: "ขวด", image: "babi-mild-ultra-mild-deo.png" },
  { name: "เรโซนา โรลออน Sexy Bouquet", unit: "ขวด", sizeLabel: "48 ชั่วโมง", image: "rexona-sexy-bouquet.png" },
  { name: "เรโซนา Powder Dry สเปรย์ระงับกลิ่นกาย", unit: "กระป๋อง", sizeLabel: "48 ชั่วโมง", image: "rexona-powder-dry-spray.png" }
].map(({ image, ...product }, index) => ({
  id: 11300 + index,
  category: "สุขภาพ/สวย",
  stock: 20,
  minStock: 5,
  price: 0,
  updatedBy: "เจ้าของร้าน",
  ...product,
  imageUrl: `/product-images/roll-on/${image}`
}));

// ป้องกันแมลง อยู่หมวด "สุขภาพ/สวย" — เข้าหมวดย่อยผ่าน keyword "กันยุง"/"ไล่ยุง"
const insectRepellentProducts: Product[] = [
  { name: "บั๊กกี้บู โลชั่นกันยุง Anti-Mosquito", unit: "หลอด", sizeLabel: "40 มล.", image: "buggie-boo-lotion-40.png" },
  { name: "ซอฟเฟล สเปรย์ฉีดกันยุง กลิ่นเนเชอรัล", unit: "ขวด", image: "soffell-spray-natural.png" },
  { name: "ซอฟเฟล สเปรย์ฉีดกันยุง กลิ่นเฟรช", unit: "ขวด", image: "soffell-spray-fresh.png" },
  { name: "ซอฟเฟล สเปรย์ฉีดกันยุง กลิ่นฟลอรัล", unit: "ขวด", image: "soffell-spray-floral.png" },
  { name: "ซอฟเฟล โลชั่นทากันยุง กลิ่นฟลอรัล", unit: "ขวด", image: "soffell-lotion-floral-bottle.png" },
  { name: "ซอฟเฟล โลชั่นทากันยุง กลิ่นฟลอรัล แบบซอง", unit: "ซอง", image: "soffell-lotion-floral-sachet.png" },
  { name: "ซอฟเฟล โลชั่นทากันยุง กลิ่นเฟรช แบบซอง", unit: "ซอง", image: "soffell-lotion-fresh-sachet.png" },
  { name: "OFF! Sakura โลชั่นทากันยุง", unit: "ซอง", image: "off-sakura-lotion.png" },
  { name: "ก.ย.15 มิลกี้โลชั่นทากันยุง กลิ่นเฟรชบลอสซั่ม", unit: "ซอง", sizeLabel: "8 กรัม", image: "koryor15-milky-lotion.png" },
  { name: "ก.ย.15 มิลกี้โลชั่นทากันยุง กลิ่นลาเวนเดอร์", unit: "ซอง", sizeLabel: "8 กรัม", image: "koryor15-milky-lavender.png" },
  { name: "ก.ย.15 มิลกี้โลชั่นทากันยุง กลิ่นนายด์ ลิลลี่", unit: "ซอง", sizeLabel: "8 กรัม", image: "koryor15-milky-night-lily.png" },
  { name: "ก.ย.15 โลชั่นทากันยุง แบบขวด", unit: "ขวด", image: "koryor15-lotion-bottle.png" },
  { name: "ก.ย.15 โลชั่นทากันยุง กลิ่นลาเวนเดอร์ แบบขวด", unit: "ขวด", sizeLabel: "50 กรัม", image: "koryor15-lotion-bottle-lavender.png" },
  { name: "ก.ย.15 แผ่นทากันยุง กลิ่นหอม", unit: "ซอง", sizeLabel: "1 ซอง ใช้ได้ 2 ครั้ง", image: "koryor15-wipe.png" },
  { name: "ก.ย.15 ยาจุดกันยุง กลิ่นลาเวนเดอร์", unit: "กล่อง", image: "koryor15-coil-lavender.png" },
  { name: "ไบกอน ยาจุดกันยุง กลิ่นยูคาลิปตัส", unit: "กล่อง", sizeLabel: "10 ขด", image: "baygon-coil-eucalyptus.png" },
  { name: "ไบกอน ยาจุดกันยุง สูตรควันน้อย กลิ่นเฟรชบลอสซั่ม", unit: "กล่อง", sizeLabel: "10 ขด", image: "baygon-coil-low-smoke.png" },
  { name: "ชิลด์ท็อกซ์ ยาจุดกันยุง สูตรควันน้อย", unit: "กล่อง", sizeLabel: "11 ชั่วโมง", image: "shieldtox-coil-low-smoke.png" },
  { name: "ห่านฟ้า ยาจุดกันยุง สูตรควันน้อย", unit: "กล่อง", sizeLabel: "10 ขด", image: "hanfa-coil-low-smoke.png" },
  { name: "อาท พลัส ยาจุดกันยุง จัมโบ้ สูตรควันน้อย", unit: "กล่อง", sizeLabel: "12 ชั่วโมง", image: "ars-plus-coil-jumbo.png" },
  { name: "อาท โนแมท พลัส เครื่องไล่ยุงไฟฟ้า 90 วัน ไร้กลิ่น", unit: "กล่อง", sizeLabel: "90 วัน", image: "ars-nomat-plus-90.png" },
  { name: "อาท โนแมท พลัส เครื่องไล่ยุงไฟฟ้า 30 วัน กลิ่นเฟรชกรีน", unit: "กล่อง", sizeLabel: "30 วัน", image: "ars-nomat-plus-30.png" },
  { name: "เรนเจอร์ สเก้าท์ เครื่องไล่ยุงไฟฟ้า ไร้สารแต่งกลิ่น", unit: "กล่อง", sizeLabel: "30 วัน", image: "ranger-scout-electric.png" },
  { name: "บั๊กซ์อเวย์ ยาจุดกันยุงสำหรับสุนัข แบบกระป๋อง", unit: "กระป๋อง", sizeLabel: "56 ขด", image: "bugs-away-dog-can-56.png" },
  { name: "บั๊กซ์อเวย์ ยาจุดกันยุงสำหรับสุนัข แบบกล่อง", unit: "กล่อง", sizeLabel: "28 ขด", image: "bugs-away-dog-box-28.png" },
  { name: "เฮิร์บการ์ด ยาจุดกันยุงสำหรับสัตว์เลี้ยง", unit: "กล่อง", sizeLabel: "12 ขด", image: "herb-guard-pet-coil-12.png" },
  { name: "แซม-บัค ยาหม่องขี้ผึ้ง ทาแมลงกัดต่อย", unit: "ตลับ", sizeLabel: "ทาหลังโดนยุง/แมลงกัด", image: "zam-buk-balm.png" }
].map(({ image, ...product }, index) => ({
  id: 11200 + index,
  category: "สุขภาพ/สวย",
  stock: 20,
  minStock: 5,
  price: 0,
  updatedBy: "เจ้าของร้าน",
  ...product,
  imageUrl: `/product-images/insect-repellent/${image}`
}));

// แชมพู/ครีมนวด อยู่หมวด "สุขภาพ/สวย" — เข้าหมวดย่อยผ่าน keyword "แชมพู"/"ครีมนวด"
// sizeLabel ใช้เป็นป้ายกำกับวิธีใช้ เช่น "ทั้งสระและถูตัว" (ของเด็ก) หรือ "แชมพู + ครีมนวด" (2 in 1)
const hairCareProducts: Product[] = [
  {
    name: "จอห์นสัน Active Kids Shiny Drops แชมพูเด็ก",
    unit: "ขวด",
    sizeLabel: "200 มล. แชมพูเด็ก",
    image: "johnsons-active-kids-shiny-drops.png"
  },
  {
    name: "ซันซิล แชมพู 2 อิน 1",
    unit: "ขวด",
    sizeLabel: "แชมพู + ครีมนวด",
    image: "sunsilk-2in1.png"
  },
  {
    name: "โคโดโม Organic แชมพูเด็ก สูตร 3 ปีขึ้นไป",
    unit: "ขวด",
    sizeLabel: "ทั้งสระและถูตัว",
    image: "kodomo-organic-shampoo-3plus.png"
  },
  {
    name: "โคโดโม Organic แชมพูเด็กแรกเกิด",
    unit: "ขวด",
    sizeLabel: "ทั้งสระและถูตัว",
    image: "kodomo-organic-shampoo-newborn.png"
  },

  // --- แชมพูผู้ใหญ่ ---
  { name: "ซันซิล แชมพู สูตรผมนุ่มลื่นสลวย", unit: "ขวด", sizeLabel: "ขวดม่วง", image: "sunsilk-shampoo-purple.png" },
  { name: "ซันซิล แชมพู สูตรผมยาวสวยสุขภาพดี", unit: "ขวด", sizeLabel: "ขวดเขียว", image: "sunsilk-shampoo-green.png" },
  { name: "แพนทีน แชมพู แฮร์ฟอล คอนโทรล", unit: "ขวด", image: "pantene-shampoo-hairfall.png" },
  { name: "เฮดแอนด์โชว์เดอร์ แชมพู คูล เมนทอล", unit: "ขวด", sizeLabel: "ขจัดรังแค", image: "head-shoulders-cool-menthol.png" },
  { name: "เฮดแอนด์โชว์เดอร์ แชมพู 2 อิน 1 คูล เมนทอล", unit: "ขวด", sizeLabel: "แชมพู + ครีมนวด", image: "head-shoulders-2in1-cool-menthol.png" },
  { name: "เคลียร์ แชมพู ไอซ์คูล เมนทอล", unit: "ขวด", sizeLabel: "ขจัดรังแค", image: "clear-ice-cool-menthol.png" },
  { name: "เคลียร์ แชมพู สคาล์ปแคร์ วิตามินซี แอปเปิ้ลไซเดอร์", unit: "ขวด", sizeLabel: "ขจัดรังแค", image: "clear-scalp-care-apple-cider.png" },

  // --- ครีมนวดผม ---
  { name: "ซันซิล ครีมนวดผม สูตรเซรั่ม ผมมีน้ำหนักจัดทรงง่าย", unit: "ขวด", sizeLabel: "ขวดชมพู", image: "sunsilk-conditioner-pink.png" },
  { name: "ซันซิล ครีมนวดผม สูตรผมยาวสวยสุขภาพดี", unit: "ขวด", sizeLabel: "ขวดเขียว", image: "sunsilk-conditioner-green.png" },
  { name: "แพนทีน ครีมนวดผม แฮร์ฟอล คอนโทรล", unit: "ขวด", image: "pantene-conditioner-hairfall.png" },
  { name: "แพนทีน ครีมนวดผม เดลี่ มอยส์เจอร์ รีนิวอัล", unit: "ขวด", image: "pantene-conditioner-moisture-renewal.png" },

  // --- แชมพูยา (ขจัดรังแค/เชื้อรา) ---
  { name: "ไนโซรัล แชมพู คีโตโคนาโซล 2%", unit: "ขวด", sizeLabel: "ยาสระผม แก้รังแค/เชื้อรา", image: "nizoral-shampoo.png" },
  { name: "เซลซัน แชมพู ซีลีเนียม ซัลไฟด์ 2.5%", unit: "ขวด", sizeLabel: "ยาสระผม แก้รังแค · 30 มล.", image: "selsun-shampoo-30.png" },

  // --- แชมพูเด็ก ---
  { name: "โคโดโม คิดส์ แชมพูเด็ก Pearly Pink", unit: "ขวด", sizeLabel: "6 ปีขึ้นไป", image: "kodomo-kids-pearly-pink.png" },
  { name: "ดีนี่ Organic แชมพูเด็ก", unit: "ขวด", sizeLabel: "แชมพูเด็ก", image: "dnee-organic-baby-shampoo.png" },
  { name: "น่ารัก เบบี้แชมพู สูตรคาโมมายล์", unit: "ขวด", sizeLabel: "ขวดชมพู", image: "narak-baby-shampoo-chamomile.png" },
  { name: "น่ารัก เบบี้แชมพู สูตรคาโมมายล์ ขวดปั๊ม", unit: "ขวด", sizeLabel: "ขวดปั๊มใหญ่", image: "narak-baby-shampoo-chamomile-pump.png" },
  { name: "น่ารัก เบบี้แชมพู สูตรมายด์", unit: "ขวด", sizeLabel: "ขวดเหลือง", image: "narak-baby-shampoo-mild.png" },

  // --- แชมพูเด็กแบบใช้ได้ทั้งตัว ---
  { name: "ดีนี่ คิดส์ แชมพูและสบู่เหลว สีชมพู", unit: "ขวด", sizeLabel: "ทั้งสระและถูตัว", image: "dnee-kids-head-body-pink.png" },
  { name: "ดีนี่ คิดส์ แชมพูและสบู่เหลว สีม่วง", unit: "ขวด", sizeLabel: "ทั้งสระและถูตัว", image: "dnee-kids-head-body-purple.png" },
  { name: "ดีนี่ คิดส์ แชมพูและสบู่เหลว สีฟ้า แอนตี้แบคทีเรีย", unit: "ขวด", sizeLabel: "ทั้งสระและถูตัว", image: "dnee-kids-head-body-blue.png" },
  { name: "ดีนี่ คิดส์ Organic แชมพูและสบู่เหลว สีม่วง แอนตี้แบคทีเรีย", unit: "ขวด", sizeLabel: "ทั้งสระและถูตัว", image: "dnee-kids-organic-head-body-purple.png" }
].map(({ image, ...product }, index) => ({
  id: 11100 + index,
  category: "สุขภาพ/สวย",
  stock: 20,
  minStock: 5,
  price: 0,
  updatedBy: "เจ้าของร้าน",
  ...product,
  imageUrl: `/product-images/health-beauty/${image}`
}));

// ของใช้ส่วนตัว แยกเป็น 2 หมวดย่อยด้วยคำว่า "กางเกง" ในชื่อ (ดู matchesPersonalCareSubcategory)
const personalCareImageBase = "/product-images/personal-care";

const personalCareProducts: Product[] = [
  // --- ผ้าอนามัย (แบบแผ่น) ---
  { name: "โซฟี แบบกระชับ 29 ซม.", unit: "แพ็ก", sizeLabel: "29 ซม. 6 ชิ้น", image: "sofy-comfort-fit-29-6.png" },
  { name: "โซฟี แบบกระชับ 25 ซม.", unit: "แพ็ก", sizeLabel: "25 ซม. 18 ชิ้น", image: "sofy-comfort-fit-25-18.png" },
  { name: "โซฟี แบบกระชับ หลับสนิทตลอดคืน 29 ซม.", unit: "แพ็ก", sizeLabel: "29 ซม. 8 ชิ้น", image: "sofy-comfort-night-29-8.png" },
  { name: "โซฟี แบบกระชับ หลับสนิทตลอดคืน 42 ซม.", unit: "แพ็ก", sizeLabel: "42 ซม. 8 ชิ้น", image: "sofy-comfort-night-42-8.png" },
  { name: "โซฟี หลับสนิทตลอดคืน 29 ซม.", unit: "แพ็ก", sizeLabel: "29 ซม. 12 ชิ้น", image: "sofy-night-29-12.png" },
  { name: "โซฟี หลับสนิทตลอดคืน 29 ซม. แพ็กใหญ่", unit: "แพ็ก", sizeLabel: "29 ซม. 16 ชิ้น", image: "sofy-night-29-16.png" },
  { name: "โซฟี Cooling Fresh มีปีก 23 ซม.", unit: "แพ็ก", sizeLabel: "23 ซม. 8 ชิ้น", image: "sofy-cooling-fresh-23-8.png" },
  { name: "โซฟี Cooling Fresh สลิม 25 ซม.", unit: "แพ็ก", sizeLabel: "25 ซม. 10 ชิ้น", image: "sofy-cooling-fresh-slim-25-10.png" },
  { name: "โซฟี Cooling Fresh 25 ซม.", unit: "แพ็ก", sizeLabel: "25 ซม. 12 ชิ้น", image: "sofy-cooling-fresh-25-12.png" },
  { name: "โซฟี Cooling Fresh Extra 29 ซม.", unit: "แพ็ก", sizeLabel: "29 ซม. 12 ชิ้น", image: "sofy-cooling-fresh-extra-29-12.png" },
  { name: "โซฟี Cooling Fresh กลางคืน 29 ซม.", unit: "แพ็ก", sizeLabel: "29 ซม. 14 ชิ้น", image: "sofy-cooling-fresh-night-29-14.png" },
  { name: "โซฟี Cooling Fresh กลางคืน 35 ซม.", unit: "แพ็ก", sizeLabel: "35 ซม. 9 ชิ้น", image: "sofy-cooling-fresh-night-35-9.png" },
  { name: "โซฟี Charcoal Fresh กลางคืน 29 ซม.", unit: "แพ็ก", sizeLabel: "29 ซม. 14 ชิ้น", image: "sofy-charcoal-fresh-29-14.png" },
  { name: "ลอรีเอะ Soft & Safe สลิม กลางวัน มีปีก", unit: "แพ็ก", sizeLabel: "4 ชิ้น", price: 12, image: "laurier-soft-safe-slim-day-4.png" },
  { name: "ลอรีเอะ Soft & Safe แม็กซี่ กลางวัน ไม่มีปีก", unit: "แพ็ก", sizeLabel: "20 ชิ้น", image: "laurier-maxi-day-20.png" },
  { name: "ลอรีเอะ Soft & Safe หลับสบาย 30 ซม.", unit: "แพ็ก", sizeLabel: "30 ซม. 6 ชิ้น", image: "laurier-night-30-6.png" },
  { name: "ลอรีเอะ Soft & Safe หลับสบาย 30 ซม. แพ็กใหญ่", unit: "แพ็ก", sizeLabel: "30 ซม. 16 ชิ้น", image: "laurier-night-30-16.png" },
  { name: "เอลิส Fairy Wings 22.5 ซม. กลางวัน มีปีก", unit: "แพ็ก", sizeLabel: "22.5 ซม. 16 ชิ้น", image: "elis-fairy-wings-225-16.png" },
  { name: "เอลิส Fairy Wings 25 ซม. กลางวัน มีปีก", unit: "แพ็ก", sizeLabel: "25 ซม. 14 ชิ้น", image: "elis-fairy-wings-25-14.png" },
  { name: "เอลิส Fairy Wings 30 ซม. กลางวัน-กลางคืน", unit: "แพ็ก", sizeLabel: "30 ซม. 12 ชิ้น", image: "elis-fairy-wings-30-12.png" },
  { name: "เอลิส Fairy Wings 35 ซม. กลางคืน", unit: "แพ็ก", sizeLabel: "35 ซม. 10 ชิ้น", image: "elis-fairy-wings-35.png" },
  { name: "เอลิส Fairy Wings 42 ซม. กลางคืน", unit: "แพ็ก", sizeLabel: "42 ซม. 6 ชิ้น", image: "elis-fairy-wings-42-6.png" },

  // --- ผ้าอนามัยแบบกางเกงใน ---
  { name: "โซฟี หลับสนิทตลอดคืน ผ้าอนามัยแบบกางเกง ไซซ์ L", unit: "แพ็ก", sizeLabel: "2 ชิ้น", image: "sofy-night-pants-l-2.png" },
  { name: "โซฟี หลับสนิทตลอดคืน ผ้าอนามัยแบบกางเกง ไซซ์ XL", unit: "แพ็ก", sizeLabel: "2 ชิ้น", image: "sofy-night-pants-xl-2.png" },
  { name: "ลอรีเอะ หลับสบาย ผ้าอนามัยแบบกางเกง อัลตราสลิม ไซซ์ L", unit: "แพ็ก", sizeLabel: "2 ชิ้น", image: "laurier-night-pants-l-2.png" },
  { name: "โดโด้ เลิฟ ผ้าอนามัยแบบกางเกง ไซซ์ M-L", unit: "แพ็ก", sizeLabel: "10 ชิ้น", image: "dodo-love-pants-ml-10.png" },

  // --- ผลิตภัณฑ์ทำความสะอาดจุดซ่อนเร้น ---
  { name: "บีไนซ์ Intimate ทำความสะอาดจุดซ่อนเร้น", unit: "ขวด", image: "benice-intimate.png" },
  { name: "มิสทิน Ladycare Intimate Cleanser สูตร Cool", unit: "ขวด", image: "mistine-ladycare-cool.png" },
  { name: "มิสทิน Ladycare Intimate Cleanser สูตร Gentle", unit: "ขวด", image: "mistine-ladycare-gentle.png" },
  { name: "มิสทิน Ladycare Anti Odor Complex", unit: "ขวด", image: "mistine-ladycare-anti-odor.png" },
  { name: "มิสทิน Ladycare Natural Balance Hygienic Cleanser", unit: "ขวด", image: "mistine-ladycare-natural-balance.png" },
  { name: "ซอลเจลล่า Saugella Dermoliquido", unit: "ขวด", image: "saugella-dermoliquido.png" },
  { name: "ซอลเจลล่า Saugella Attiva สูตรปกป้อง", unit: "ขวด", image: "saugella-attiva.png" },
  { name: "มิสทิน Ladycare Intimate Cleanser ขวดชมพู", unit: "ขวด", image: "mistine-ladycare-classic-pink.png" },
  { name: "มิสทิน Ladycare Intimate Cleanser ขวดฟ้า", unit: "ขวด", image: "mistine-ladycare-classic-blue.png" },
  { name: "มิสทิน Ladycare Intimate Cleanser ขวดม่วง", unit: "ขวด", image: "mistine-ladycare-classic-purple.png" },
  { name: "แลคตาซิด Lactacyd Soft & Silky", unit: "ขวด", image: "lactacyd-soft-silky.png" },
  { name: "แลคตาซิด Lactacyd All-Day Care", unit: "ขวด", image: "lactacyd-all-day-care.png" },
  { name: "แลคตาซิด Lactacyd Odor Fresh", unit: "ขวด", image: "lactacyd-odor-fresh.png" },
  { name: "แลคตาซิด Lactacyd Extra Sensitive", unit: "ขวด", image: "lactacyd-extra-sensitive.png" },
  { name: "แลคตาซิด Lactacyd Extra Milky", unit: "ขวด", image: "lactacyd-extra-milky.png" },
  { name: "โชกุบุสสึ Feminine Cleansing สูตร Everyday Confidence", unit: "ขวด", image: "shokubutsu-everyday-confidence.png" },
  { name: "โชกุบุสสึ Feminine Cleansing สูตร Daily Gentle Care", unit: "ขวด", image: "shokubutsu-daily-gentle-care.png" },
  { name: "RADA Lady Care Clean", unit: "ขวด", sizeLabel: "50 มล.", image: "rada-lady-care-clean.png" },
  { name: "Rien Feminine Care สูตร Extra Care", unit: "ขวด", image: "rien-feminine-care-extra.png" },
  { name: "Oriental Princess Feminine Hygiene สูตร Soft Touch", unit: "ขวด", image: "oriental-princess-soft-touch.png" },
  { name: "เบบี้มายด์ Ultra Mild Feminine Cleansing สูตร Organic", unit: "ขวด", image: "babi-mild-ultra-mild-organic.png" }
].map(({ image, ...product }, index) => ({
  id: 11000 + index,
  category: "ของใช้ส่วนตัว",
  stock: 20,
  minStock: 5,
  price: 0,
  updatedBy: "เจ้าของร้าน",
  ...product,
  imageUrl: `${personalCareImageBase}/${image}`
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
  ] as { name: string; price?: number; sizeLabel?: string; unit?: string; image?: string }[]
).map(({ image, ...product }, index) => ({
  id: 12000 + index,
  category: "ขนมและของกินเล่น",
  stock: 20,
  minStock: 5,
  unit: "ซอง",
  price: 5,
  updatedBy: "เจ้าของร้าน",
  ...product,
  imageUrl: image ? `/product-images/snack/${image}` : productImageByName[product.name]
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

// ยาสามัญประจำบ้าน — `image` = ไฟล์ใน /product-images/medicine/ (เว้นว่างได้ จะ fallback ไป productImageByName)
// ชื่อที่ซ้ำกันหลายแบบ (พิมเสนน้ำ / ยาหม่องถ้วยทอง / ยาดมหงส์ไทย) ต้องผูกรูปผ่าน productImageByKey เท่านั้น
type MedicineSeed = {
  name: string;
  unit?: string;
  sizeLabel?: string;
  price?: number;
  image?: string;
};

const medicineImageBase = "/product-images/medicine";

const medicineProducts: Product[] = ([
  // --- ยาดม / พิมเสน ---
  { name: "ยาดมแบบขวด ขวดแดง", unit: "ขวด", image: "inhaler-bottle-red.png" },
  { name: "ยาดมตราเสือ (Tiger Balm Inhaler)", image: "tiger-balm-inhaler.png" },
  { name: "ยาดมโป๊ยเซียน มาร์คทู", sizeLabel: "คละสี", image: "poysian-mark-two.png" },
  { name: "ยาดมเป๊ปเปอร์มินท์ฟิลด์", sizeLabel: "คละสี", image: "peppermint-field.png" },
  { name: "ยาดมเป๊ปเปอร์มินท์ฟิลด์ แบล็ค", unit: "หลอด", image: "peppermint-field-black.png" },
  { name: "ยาดมส้มมือ ตราจรุงจิต", unit: "หลอด", image: "jarungjit-inhaler.png" },
  { name: "ยาดมสมุนไพร ตราโพธิ์ประดิษฐ์", unit: "หลอด", image: "pho-pradit-inhaler.png" },
  { name: "ยาดมตราถ้วยทอง กลิ่นเลมอน" },
  // ยาดมสมุนไพรแบบกระปุก
  { name: "ยาดมสมุนไพร ตราหงส์ไทย", unit: "กระปุก", sizeLabel: "สีเหลือง" },
  { name: "ยาดมสมุนไพร ตราหงส์ไทย", unit: "กระปุก", sizeLabel: "สีเขียว" },
  { name: "ยาดมสมุนไพร ตราวังว่าน", unit: "กระปุก", image: "wangwan-herbal-balm.png" },
  { name: "ยาดมสมุนไพร ตรามังกรทอง", unit: "กระปุก" },
  // พิมเสนน้ำ ตราโป๊ยเซียน
  { name: "พิมเสนน้ำ ตราโป๊ยเซียน", unit: "หลอด", sizeLabel: "แบบโรลออน" },
  { name: "พิมเสนน้ำ ตราโป๊ยเซียน", unit: "ขวด", sizeLabel: "แบบขวด" },
  { name: "พิมเสนน้ำ ตราโป๊ยเซียน", unit: "กระปุก", sizeLabel: "แบบตลับ" },
  // ยาหม่อง
  { name: "ยาหม่องตราถ้วยทอง 2493", unit: "กระปุก", sizeLabel: "กระปุก 50 กรัม" },
  { name: "ยาหม่องตราเสือ (Tiger Balm HR)", unit: "กระปุก", image: "tiger-balm-hr.png" },
  { name: "น้ำมันโอสถทิพย์", unit: "กระปุก", sizeLabel: "สีเขียว", image: "osot-thip-green.png" },
  { name: "ยาหม่องตราวังว่าน", unit: "กระปุก", sizeLabel: "100 กรัม", image: "wangwan-balm-brown.png" },
  { name: "ยาหม่องโอสถ ตรารำม้า", unit: "กระปุก", sizeLabel: "200 กรัม", image: "osot-ram-ma-balm.png" },
  { name: "ยาหม่องตราถ้วยทอง 2493", unit: "ตลับ", sizeLabel: "ตลับเล็ก 8 กรัม" },
  { name: "ยาหม่องน้ำ ตราถ้วยทอง 2493", unit: "ขวด", image: "golden-cup-oil.png" },
  { name: "ยาหม่องสมุนไพร ตราวังพรม สูตร 2", unit: "กระปุก", sizeLabel: "50 กรัม", image: "wangprom-balm-formula2.png" },
  { name: "ยาหม่องสำเภาทอง สูตรไพล", unit: "กระปุก", image: "sampao-thong-phlai-balm.png" },
  { name: "ยาอมมายบาซิน รสมินต์ (Mybacin Throat)", unit: "ซอง", sizeLabel: "บรรเทาระคายคอ · 10 เม็ด", image: "mybacin-throat-mint.png" },
  { name: "ยาหม่องไพล (Compound Phlai Balm)", unit: "กระปุก", sizeLabel: "20 กรัม", image: "phlai-balm-mor-eiang.png" },
  { name: "วิกส์ วาโปรับ (Vicks VapoRub)", unit: "ตลับ", image: "vicks-vaporub.png" },
  { name: "ยาน้ำสเปรย์ ตรานำมวย", unit: "ขวด", sizeLabel: "สเปรย์ 40 มล." },
  { name: "น้ำมันมวย ตรานำมวย", unit: "ขวด", image: "nam-man-muay.png" },
  { name: "ครีมยาบรรเทาปวดเมื่อย ตรามวย", unit: "หลอด", sizeLabel: "ชนิดครีม", image: "muay-pain-cream.png" },
  // ผิวหนัง / แมลงกัดต่อย — sizeLabel ใช้กำกับว่ายาช่วยเรื่องอะไร
  { name: "ยาทาเสลดพังพอน ชนิดตลับ", unit: "ตลับ", sizeLabel: "แก้แมลงกัดต่อย", image: "saled-phangphon-tin.png" },
  { name: "คาดรามีน-วี โลชั่น (Cadramine-V Lotion)", unit: "ขวด", sizeLabel: "แก้ผดผื่นคัน · 60 มล.", image: "cadramine-v-lotion.png" },
  { name: "คาลาไมน์ โลชั่น (Calamine Lotion)", unit: "ขวด", sizeLabel: "แก้ผดผื่นคัน · 60 มล.", image: "calamine-lotion.png" },
  { name: "คาลาไมน์พญายอ", unit: "ขวด", sizeLabel: "แก้ผดผื่นคัน แมลงกัด", image: "calamine-phayayor.png" },
  { name: "คาเนสเทน ยาครีมฆ่าเชื้อรา (Canesten)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา · 10 กรัม", image: "canesten-cream.png" },
  { name: "ไลมาริน ครีม (Lymarin Cream)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา/แบคทีเรีย · 15 กรัม", image: "lymarin-cream.png" },
  { name: "คีล่า โลชั่น (Kela Lotion)", unit: "ขวด", sizeLabel: "แก้ผื่นแพ้ผิวหนัง" },
  { name: "เบต้า-ไดโป ครีม (Beta-Dipo Cream)", unit: "หลอด", sizeLabel: "แก้ผื่นแพ้อักเสบ · 10 กรัม" },
  { name: "ฟังจิเดอร์ม-บี ครีม (Fungiderm-B Cream)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา · 20 กรัม", image: "fungiderm-b-cream.png" },
  { name: "ซีมา ครีม รักษาฮ่องกงฟุต (Zema Cream)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา (ฮ่องกงฟุต) · 10 กรัม", image: "zema-cream.png" },
  { name: "ซีมา โลชั่น (Zema Lotion)", unit: "ขวด", sizeLabel: "ยาทาเชื้อรา ชนิดน้ำ", image: "zema-lotion.png" },
  { name: "โทนาฟ ครีม (TONAF Cream)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา · 5 กรัม", image: "tonaf-cream.png" },
  { name: "ไมโครัล ครีม (Micoral Cream)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา", image: "micoral-cream.png" },
  { name: "ยาครีมโคลไทรมาโซล 1% (Clotrimazole)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา · 15 กรัม", image: "clotrimazole-cream.png" },
  { name: "แฟงโก้-บี ครีม (Fango-B Cream)", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา · 15 กรัม", image: "fango-b-cream.png" },
  { name: "มายด้า-บี ครีม (Myda-B Cream)", unit: "หลอด", sizeLabel: "แก้ผื่นแพ้อักเสบ · 25 กรัม", image: "myda-b-cream.png" },
  { name: "โคลเบท ครีม (Clobet Cream)", unit: "หลอด", sizeLabel: "แก้ผื่นแพ้อักเสบ · 15 กรัม", image: "clobet-cream.png" },
  { name: "คานาโซน ซี.บี. ครีม", unit: "หลอด", sizeLabel: "ยาทาเชื้อรา · 15 กรัม", image: "kanazone-cb.png" },
  { name: "เฟนิสทิล เจล (Fenistil Gel)", unit: "หลอด", sizeLabel: "แก้คัน แมลงกัดต่อย · 20 กรัม", image: "fenistil-gel.png" },
  { name: "บีแพนเธน ออยเมนต์ (Bepanthen Ointment)", unit: "หลอด", sizeLabel: "บำรุงผิวแห้ง ผื่นผ้าอ้อม · 50 กรัม", image: "bepanthen-ointment.png" },
  { name: "บีแพนเธน เซนซิเดิร์ม ครีม (Bepanthen Sensiderm)", unit: "หลอด", sizeLabel: "แก้คัน ผื่นภูมิแพ้ · 20 กรัม", image: "bepanthen-sensiderm.png" },
  { name: "เยนเชี่ยนไวโอเลต ตราสหการ", unit: "ขวด", sizeLabel: "ทาแผล ฆ่าเชื้อ", image: "gentian-violet-sahakarn.png" },
  { name: "ไพแร็ต-ไวโอเล็ต (Pyrad-Violet)", unit: "ขวด", sizeLabel: "ทาแผล ฆ่าเชื้อ · 450 มล.", image: "pyrad-violet.png" },
  // เบตาดีน อยู่ในหมวด "ปฐมพยาบาล" แล้ว (ไม่ใส่ซ้ำที่นี่)
  { name: "เดอร์มาติกซ์ อัลตร้า (Dermatix Ultra)", unit: "หลอด", sizeLabel: "เจลลดรอยแผลเป็น" },
  // ยาสมุนไพร / บรรเทาอาการ
  { name: "ฟ้าทะลายโจร แคปซูล (Phyto Care)", unit: "กล่อง", sizeLabel: "บรรเทาเจ็บคอ · 100 แคปซูล" },
  { name: "ฟ้าทะลายโจร แคปซูล ตราอภัยภูเบศร", unit: "กล่อง", sizeLabel: "แก้ไข้", image: "fah-talai-jone-abhaibhubejhr.png" },
  { name: "ฟ้าทะลายโจร แคปซูล ตราอภัยภูเบศร แบบกระปุก", unit: "กระปุก", sizeLabel: "แก้ไข้ เจ็บคอ", image: "fah-talai-jone-abhai-jar.png" },
  { name: "ยากษัยเส้น ตราเด็กในพานทอง", unit: "กล่อง", sizeLabel: "คลายปวดเมื่อย/ยาระบาย · 10 แคปซูล", image: "kasaisen-dek-nai-phan-thong.png" },
  { name: "ยากษัยเส้น ตราม้าปลาคู่", unit: "กล่อง", sizeLabel: "บรรเทาปวดเมื่อยตามร่างกาย", image: "kasaisen-ma-pla-khu.png" },
  { name: "ยาแก้ท้องเสีย ตราเขากวาง", unit: "ขวด", sizeLabel: "แก้ท้องเสีย ท้องร่วง" },
  { name: "ยาน้ำเขากุ้ย (Kao-Kui Water)", unit: "ขวด", sizeLabel: "แก้ไข้ ร้อนใน กระหายน้ำ", image: "kao-kui-water.png" },
  { name: "ยาน้ำเขากุ้ย ตราเคเอ็มพี", unit: "ขวด", sizeLabel: "แก้ไข้ ร้อนใน · 240 มล.", image: "kao-kui-kmp.png" },
  { name: "ยาน้ำแก้ตัวร้อนเขากุย ตราแพะ", unit: "ขวด", sizeLabel: "แก้ไข้ ตัวร้อน ร้อนใน", image: "kao-kui-goat.png" },
  { name: "ยาธาตุน้ำขาว ตรากระต่ายบิน", unit: "ขวด", sizeLabel: "แก้ท้องอืด ท้องเฟ้อ · 200 มล.", image: "ya-that-nam-khao-rabbit.png" },
  { name: "ยาหอม ตรา 5 เจดีย์", unit: "ซอง", sizeLabel: "แก้วิงเวียน บำรุงหัวใจ", image: "yahom-five-pagodas.png" },
  { name: "ยาหอมเบอร์ 33 ตราห้าม้า", unit: "ขวด", sizeLabel: "บำรุงหัวใจ แก้วิงเวียน" },
  { name: "ขมิ้นชัน แคปซูล ตราอภัยภูเบศร", unit: "กระปุก", sizeLabel: "บรรเทาท้องอืด", image: "turmeric-abhaibhubejhr.png" },
  { name: "ขมิ้นชัน แคปซูล ตราไพลดาว", unit: "กระปุก", sizeLabel: "บรรเทาท้องอืด", image: "turmeric-phlaidao.png" },
  { name: "ขมิ้นชัน แคปซูล ตราอ้วยอันโอสถ", unit: "กระปุก", sizeLabel: "บรรเทาท้องอืด · 100 แคปซูล", image: "turmeric-ouay-un.png" },
  { name: "ขมิ้นชัน แคปซูล ไฟโตแคร์", unit: "กล่อง", sizeLabel: "บรรเทาท้องอืด · 100 แคปซูล", image: "turmeric-phytocare.png" },
  { name: "ยาแคปซูลบัวบก ตราอภัยภูเบศร", unit: "กระปุก", sizeLabel: "ยาสมุนไพร", image: "centella-abhaibhubejhr.png" },
  // แก้ปวด / ลดไข้
  { name: "ไทลินอล พาราเซตามอล 500 มก.", unit: "กล่อง", sizeLabel: "แก้ปวด ลดไข้ · 500 มก.", image: "tylenol-500.png" },
  { name: "ไทลินอล 8 ชั่วโมง 650 มก.", unit: "กล่อง", sizeLabel: "ปวดกล้ามเนื้อ · 10 เม็ด", image: "tylenol-8hr-650.png" },
  { name: "พาราเซตามอล พาราแคป 500 มก.", unit: "กล่อง", sizeLabel: "แก้ปวด ลดไข้ · 500 มก.", image: "paracap-500.png" },
  { name: "พาราเซตามอล เซมอล 500 มก.", unit: "ขวด", sizeLabel: "แก้ปวด ลดไข้ · 100 เม็ด", image: "cemol-500.png" },
  { name: "พาราเซตามอล มายพารา 500 มก.", unit: "กล่อง", sizeLabel: "แก้ปวด ลดไข้ · 10x10 เม็ด", image: "mypara-500.png" },
  { name: "พาราเซตามอล ซาร่า 500 มก.", unit: "กล่อง", sizeLabel: "แก้ปวด ลดไข้ · 500 มก.", image: "sara-paracetamol-500.png" },
  { name: "ทัมใจ ตรากิเลน", unit: "ซอง", sizeLabel: "ยาแก้ปวด ลดไข้ ชนิดผง", image: "thumjai.png" },
  { name: "พอนสแตน 500 (Ponstan)", unit: "แผง", sizeLabel: "แก้ปวด ปวดประจำเดือน", image: "ponstan-500.png" },
  { name: "เอ็ม.16 พาตาร์ 75 ยาแก้ปวดฟัน", unit: "ชุด", sizeLabel: "บรรเทาปวดฟัน", image: "m16-patar-75.png" },
  // หวัด / ไอ / เจ็บคอ
  { name: "ทิฟฟี่ ไซรัป (Tiffy)", unit: "ขวด", sizeLabel: "บรรเทาหวัด · 60 มล." },
  { name: "ทิฟฟี่ เดย์ ชนิดเม็ด", unit: "ซอง", sizeLabel: "บรรเทาหวัด · 4 เม็ด", image: "tiffy-day-tablet.png" },
  { name: "ทิฟฟี่ รับ (Tiffy Rub)", unit: "ตลับ", sizeLabel: "ทาบรรเทาหวัด คัดจมูก", image: "tiffy-rub.png" },
  { name: "ดีคอลเจน ชนิดเม็ด", unit: "ซอง", sizeLabel: "บรรเทาหวัด คัดจมูก", image: "decolgen-tablet.png" },
  { name: "คลอร์เฟนิรามีน 4 มก.", unit: "กระปุก", sizeLabel: "แก้แพ้ ลดน้ำมูก · 100 เม็ด", image: "chlorpheniramine-4mg.png" },
  { name: "โซลแมกซ์ คาร์โบซิสเทอีน 500 มก.", unit: "แผง", sizeLabel: "ละลายเสมหะ", image: "solmax-carbocisteine.png" },
  { name: "สเตร็ปซิล ฮันนี่&เลมอน (Strepsils)", unit: "แผง", sizeLabel: "ยาอมเจ็บคอ · 8 เม็ด", image: "strepsils-honey-lemon.png" },
  { name: "สเตร็ปซิล คูล (Strepsils Cool)", unit: "แผง", sizeLabel: "ยาอมเจ็บคอ · 8 เม็ด", image: "strepsils-cool.png" },
  { name: "สเตร็ปซิล ออเรนจ์ + วิตามินซี", unit: "แผง", sizeLabel: "ยาอมเจ็บคอ", image: "strepsils-orange-vitc.png" },
  { name: "สเตร็ปซิล ซิตรัส เลมอน ไม่มีน้ำตาล", unit: "แผง", sizeLabel: "ยาอมเจ็บคอ · 6 เม็ด", image: "strepsils-citrus-lemon.png" },
  { name: "ดิฟแลม ฮันนี่&เลมอน (Difflam)", unit: "แผง", sizeLabel: "ยาอมเจ็บคอ · 8 เม็ด", image: "difflam-honey-lemon.png" },
  { name: "เบตาดีน สเปรย์พ่นคอ (Betadine Throat Spray)", unit: "ขวด", sizeLabel: "พ่นคอ · 12 มล.", image: "betadine-throat-spray.png" },
  { name: "ยาอมมะแว้ง", unit: "ซอง", sizeLabel: "บรรเทาไอ ขับเสมหะ", image: "ma-waeng-lozenge.png" },
  { name: "ยาอมมะแว้ง ตราไอยรา รสบ๊วย", unit: "ซอง", sizeLabel: "บรรเทาไอ ขับเสมหะ", image: "ma-waeng-aiyara-buoy.png" },
  { name: "ยาอมมายบาซิน โอทีซี เลมอน (Mybacin OTC)", unit: "ซอง", sizeLabel: "บรรเทาระคายคอ · 8 เม็ด", image: "mybacin-otc-lemon.png" },
  { name: "ยาอมสมุนไพร ตรามังกรทอง รสเปลือกส้ม", unit: "ซอง", sizeLabel: "บรรเทาไอ ชุ่มคอ", image: "dragon-lozenge-orange-peel.png" },
  { name: "ยาอมสมุนไพร ตรามังกรทอง รสบ๊วยเค็ม", unit: "ซอง", sizeLabel: "บรรเทาไอ ชุ่มคอ", image: "dragon-lozenge-salty-plum.png" },
  { name: "ยาอมสมุนไพร ตราคุณเปรมา", unit: "ซอง", sizeLabel: "บรรเทาไอ ชุ่มคอ", image: "khun-prema-lozenge.png" },
  { name: "ยาอมกำกิกเผี่ยง (Gumgig Pean)", unit: "แผง", sizeLabel: "ขับเสมหะ ชุ่มคอ · 20 เม็ด", image: "gumgig-pean.png" },
  { name: "ยาอมโบตัน ตรากิเลน", unit: "ซอง", sizeLabel: "ชุ่มคอ", image: "botan-lozenge.png" },
  { name: "ยาอมแก้ไอ ตราตะขาบ 5 ตัว", unit: "ซอง", sizeLabel: "บรรเทาไอ ขับเสมหะ", image: "takhap-5-tua-lozenge.png" },
  { name: "ยูอีคอฟ ยาอมผสมมะขามป้อม", unit: "ซอง", sizeLabel: "บรรเทาไอ ขับเสมหะ", image: "ucough-lozenge.png" },
  { name: "ฟิชเชอร์แมนส์ เฟรนด์ รสเชอร์รี่", unit: "ซอง", sizeLabel: "ยาอมชุ่มคอ", image: "fishermans-friend-cherry.png" },
  { name: "ฟิชเชอร์แมนส์ เฟรนด์ รสสเปียร์มินต์", unit: "ซอง", sizeLabel: "ยาอมชุ่มคอ", image: "fishermans-friend-spearmint.png" },
  { name: "ฟิชเชอร์แมนส์ เฟรนด์ รสแมนดาริน", unit: "ซอง", sizeLabel: "ยาอมชุ่มคอ", image: "fishermans-friend-mandarin.png" },
  { name: "ฟิชเชอร์แมนส์ เฟรนด์ รสแบล็คเคอร์แรนท์", unit: "ซอง", sizeLabel: "ยาอมชุ่มคอ", image: "fishermans-friend-blackcurrant.png" },
  // ยาน้ำแก้ไอ
  { name: "ยาน้ำแก้ไอ ตราอาปาเช่", unit: "ขวด", sizeLabel: "สมุนไพร บรรเทาไอ", image: "cough-apache.png" },
  { name: "ยาน้ำแก้ไอ ตราเสือดาว ผสมมะขามป้อม", unit: "ขวด", sizeLabel: "บรรเทาไอ · 60 มล.", image: "cough-leopard-makhampom.png" },
  { name: "ยาน้ำแก้ไอ ตราเสือดาว รสน้ำผึ้งผสมมะนาว", unit: "ขวด", sizeLabel: "บรรเทาไอ · 60 มล.", image: "cough-leopard-honey-lemon.png" },
  { name: "ยาน้ำแก้ไอเปล้าน้ำเงิน ตราเสือดาว", unit: "ขวด", sizeLabel: "บรรเทาไอ ขับเสมหะ", image: "cough-plao-namngoen.png" },
  { name: "ยาน้ำแก้ไอมะแว้ง ตราไอยรา", unit: "ขวด", sizeLabel: "บรรเทาไอ ขับเสมหะ", image: "cough-aiyara-ma-waeng.png" },
  { name: "ยาน้ำแก้ไอผสมมะขามป้อม ตราอภัยภูเบศร", unit: "ขวด", sizeLabel: "บรรเทาไอ · 120 มล.", image: "cough-abhai-makhampom.png" },
  { name: "ยาน้ำแก้ไอมะแว้งน้ำดำ ไฟโตแคร์", unit: "ขวด", sizeLabel: "บรรเทาไอ · 60 มล.", image: "ma-waeng-black-phytocare.png" },
  { name: "ยาน้ำแก้ไอผสมมะขามป้อม สูตรเย็น ไฟโตแคร์", unit: "ขวด", sizeLabel: "บรรเทาไอ · 60 มล.", image: "cough-phytocare-cool.png" },
  { name: "ยูอีคอฟ ไซรัป ผสมมะขามป้อม", unit: "ขวด", sizeLabel: "บรรเทาไอ · 120 มล.", image: "ucough-syrup.png" },
  { name: "ยาน้ำแก้ไอโยกี (Yoki Cough Syrup)", unit: "ขวด", sizeLabel: "บรรเทาไอ · 60 มล.", image: "yoki-cough-syrup.png" },
  // ภูมิแพ้
  { name: "อัลเลอร์นิค เซทิริซีน (Allernix)", unit: "กล่อง", sizeLabel: "แก้ภูมิแพ้ · 1 เม็ด/วัน", image: "allernix.png" },
  { name: "เดสต้า เดสลอราทาดีน 5 มก. (DESTA)", unit: "แผง", sizeLabel: "แก้ภูมิแพ้ · 10 เม็ด", image: "desta-5mg.png" },
  // ปวดเมื่อย
  { name: "เคาน์เตอร์เพน (Counterpain)", unit: "หลอด", sizeLabel: "ยานวดคลายกล้ามเนื้อ", image: "counterpain.png" },
  { name: "เคาน์เตอร์เพน คูล (Counterpain Cool)", unit: "หลอด", sizeLabel: "เจลนวดสูตรเย็น", image: "counterpain-cool.png" },
  { name: "เคาน์เตอร์เพน พลัส (Counterpain Plus)", unit: "หลอด", sizeLabel: "เจลลดอักเสบ ข้อเสื่อม", image: "counterpain-plus.png" },
  { name: "เคาน์เตอร์เพน แผ่นแปะ", unit: "ซอง", sizeLabel: "แผ่นแปะบรรเทาปวด · 4 แผ่น", image: "counterpain-plaster-warm.png" },
  { name: "ซาลอนพาส แผ่นแปะ (Salonpas)", unit: "ซอง", sizeLabel: "แผ่นแปะคลายปวดเมื่อย · 10 แผ่น", image: "salonpas-patch.png" },
  { name: "ซาลอนพาส ครีม (Salonpas Cream)", unit: "หลอด", sizeLabel: "ครีมนวดคลายปวด · 30 กรัม", image: "salonpas-cream.png" },
  { name: "นีโอบัน แผ่นแปะ (Neobun)", unit: "กล่อง", sizeLabel: "แผ่นแปะคลายปวด · 10 แผ่น", image: "neobun-plaster.png" },
  { name: "ยาหม่องตราเสือ แผ่นแปะ สูตรร้อน", unit: "ซอง", sizeLabel: "แผ่นแปะคลายปวด", image: "tiger-balm-plaster-rd.png" },
  // ระบบทางเดินอาหาร
  { name: "ผงถ่าน มายคาร์บอน (Activated Charcoal)", unit: "กล่อง", sizeLabel: "แก้ท้องเสีย ดูดสารพิษ", image: "mycarbon.png" },
  { name: "ผงถ่าน คาร์บอน (Activated Charcoal)", unit: "แผง", sizeLabel: "แก้ท้องเสีย · 10 แคปซูล", image: "greater-carbon.png" },
  { name: "แอนตาซิล เจล (Antacil Gel)", unit: "ขวด", sizeLabel: "ลดกรด แก้แสบท้อง · 240 มล.", image: "antacil-gel.png" },
  { name: "แอนตาซิล ชนิดเม็ด (Antacil)", unit: "กล่อง", sizeLabel: "ลดกรด แก้แสบท้อง", image: "antacil-tablet.png" },
  { name: "เบลซิด ฟอร์ท (Belcid Forte)", unit: "ขวด", sizeLabel: "ลดกรด แก้ท้องอืด · 240 มล.", image: "belcid-forte.png" },
  { name: "อีโน ผงฟู่ รสส้ม (ENO)", unit: "ซอง", sizeLabel: "ลดกรด แก้ท้องอืด", image: "eno-orange.png" },
  { name: "อีโน ผงฟู่ รสเลมอน (ENO)", unit: "ซอง", sizeLabel: "ลดกรด แก้ท้องอืด", image: "eno-lemon.png" },
  // เกลือแร่
  { name: "ผงเกลือแร่ ออรีด้า รสส้ม (ORS)", unit: "ซอง", sizeLabel: "ชดเชยการเสียน้ำ", image: "ors-oreeda-orange.png" },
  { name: "ผงเกลือแร่ นีโอ-ไลต์ รสส้ม", unit: "ซอง", sizeLabel: "ชดเชยการเสียน้ำ", image: "neo-lyte-orange.png" },
  { name: "ผงเกลือแร่ โอ อาร์ เอส-เอชอาร์ รสส้ม", unit: "ซอง", sizeLabel: "ชดเชยการเสียน้ำ", image: "ops-sea-ors-hr-orange.png" },
  { name: "ผงเกลือแร่ สตรอง-เค รสส้ม", unit: "ซอง", sizeLabel: "ชดเชยการเสียน้ำ", image: "strong-k-orange.png" },
  { name: "ผงเกลือแร่ ซี-ไลท์ กลิ่นมะนาว", unit: "ซอง", sizeLabel: "ชดเชยการเสียน้ำ", image: "c-lyte-lemon.png" },
  { name: "ผงเกลือแร่ ซี-ไลท์ กลิ่นส้ม", unit: "ซอง", sizeLabel: "ชดเชยการเสียน้ำ", image: "c-lyte-orange.png" },
  { name: "ผงเกลือแร่ รอแยล-ดี (Royal-D)", unit: "ซอง", sizeLabel: "ชดเชยการเสียน้ำ", image: "royal-d.png" },
  // ล้างจมูก
  { name: "คลีนแอนด์แคร์ สเปรย์น้ำเกลือพ่นจมูก", unit: "ขวด", sizeLabel: "พ่นล้างจมูก · 18 มล.", image: "klean-kare-nizzy-spray.png" }
] as MedicineSeed[]).map(({ image, ...product }, index) => ({
  id: 14000 + index,
  category: "ยาสามัญประจำบ้าน",
  stock: 20,
  minStock: 5,
  unit: "หลอด",
  price: 0,
  updatedBy: "เจ้าของร้าน",
  ...product,
  imageUrl: image ? `${medicineImageBase}/${image}` : productImageByName[product.name]
}));

const firstAidProducts: Product[] = ([
  // สำลี / ผ้าก๊อซ / ผ้าพันแผล
  { name: "สำลีก้อน ตรารถพยาบาล", unit: "ถุง", sizeLabel: "ใช้ทำความสะอาดแผล", image: "cotton-ball-ambulance.png" },
  { name: "สำลีม้วน ตรารถพยาบาล", unit: "ถุง", sizeLabel: "200 กรัม", image: "cotton-roll-ambulance.png" },
  { name: "สำลีแผ่น ตรารถพยาบาล", unit: "ถุง", sizeLabel: "100 กรัม", image: "cotton-pad-ambulance.png" },
  { name: "คอตตอนบัด ตราไวท์แรบบิท", unit: "ถุง", sizeLabel: "ก้านสำลี 100 ก้าน" },
  { name: "สำลีก้าน ตรารถพยาบาล", unit: "ถุง", sizeLabel: "ก้านสำลี 200 ก้าน x3" },
  { name: "ผ้าก๊อซแผ่น ตราไวท์พลูม", unit: "ห่อ", sizeLabel: "100 ชิ้น", image: "gauze-white-plume.png" },
  { name: "ผ้าก๊อซปิดแผลพร้อมใช้ SOS Plus", unit: "ซอง", sizeLabel: "8x8 ซม. 4 แผ่น", image: "sos-plus-gauze.png" },
  { name: "ผ้าพันแผล ตรารถพยาบาล", unit: "ม้วน", sizeLabel: "36 นิ้ว x 100 หลา", image: "bandage-ambulance.png" },
  // พลาสเตอร์
  { name: "ไทเกอร์พลาส พลาสเตอร์ใส (Tigerplast Clear)", unit: "กล่อง", sizeLabel: "พลาสเตอร์ปิดแผล 10 แผ่น", image: "tigerplast-clear.png" },
  { name: "ไทเกอร์พลาส ผ้ายืด (Tigerplast Elastic Fabric)", unit: "กล่อง", sizeLabel: "100 แผ่น", image: "tigerplast-elastic-fabric.png" },
  { name: "ไทเกอร์พลาส เซนซิทีฟ (Tigerplast Sensitive)", unit: "กล่อง", sizeLabel: "ผิวบอบบาง 10 แผ่น", image: "tigerplast-sensitive.png" },
  { name: "เทนโซพล้าส พลาสเตอร์ยา (Tensoplast)", unit: "กล่อง", sizeLabel: "100 แผ่น", image: "tensoplast-100.png" },
  { name: "นีโอพลาสท์-เอส พลาสเตอร์ยา (Neoplast-S)", unit: "กล่อง", sizeLabel: "100 แผ่น", image: "neoplast-s.png" },
  { name: "ไรโนบัน พลาสเตอร์ยา (Rhinobun)", unit: "กล่อง", sizeLabel: "10 แผ่น", image: "rhinobun-plaster.png" },
  // น้ำเกลือ / น้ำยาฆ่าเชื้อ
  { name: "คลีนแอนด์แคร์ น้ำเกลือล้างแผล", unit: "ขวด", sizeLabel: "100 มล.", image: "klean-kare-nss-100.png" },
  { name: "คลีนแอนด์แคร์ น้ำเกลือล้างแผล", unit: "ขวด", sizeLabel: "200 มล.", image: "klean-kare-nss-200.png" },
  { name: "คลีนแอนด์แคร์ น้ำเกลือล้างแผล", unit: "ขวด", sizeLabel: "500 มล.", image: "klean-kare-nss-500.png" },
  { name: "คลีนแอนด์แคร์ น้ำเกลือล้างแผล", unit: "ขวด", sizeLabel: "1000 มล.", image: "klean-kare-nss-1000.png" },
  { name: "ซอฟคลีน น้ำเกลือล้างแผล (Sofclens)", unit: "ขวด", sizeLabel: "1000 มล.", image: "sofclens-nss.png" },
  { name: "แอลกอฮอล์ 70% ตราศิริบัญชา", unit: "ขวด", sizeLabel: "ขวดเล็ก", image: "alcohol-70-small.png" },
  { name: "แอลกอฮอล์ 70% ตราศิริบัญชา", unit: "ขวด", sizeLabel: "ขวดใหญ่", image: "alcohol-70-large.png" },
  { name: "แอลซอฟ แอลกอฮอล์ 70% (ALSOFF)", unit: "ขวด", sizeLabel: "450 มล.", image: "alsoff-alcohol-70.png" },
  { name: "ไฮโดรเจนเพอร์ออกไซด์ ตราศิริบัญชา", unit: "ขวด", sizeLabel: "ขวดเล็ก", image: "hydrogen-peroxide-60.png" },
  { name: "ไฮโดรเจนเพอร์ออกไซด์ ตราศิริบัญชา", unit: "ขวด", sizeLabel: "450 มล.", image: "hydrogen-peroxide-450.png" },
  { name: "เบตาดีน น้ำยาใส่แผล (Betadine Antiseptic)", unit: "ขวด", sizeLabel: "ฆ่าเชื้อ ใส่แผล", image: "betadine-antiseptic.png" }
] as MedicineSeed[]).map(({ image, ...product }, index) => ({
  id: 15000 + index,
  category: "ปฐมพยาบาล",
  stock: 20,
  minStock: 5,
  unit: "ชิ้น",
  price: 0,
  updatedBy: "เจ้าของร้าน",
  ...product,
  imageUrl: image ? `/product-images/first-aid/${image}` : productImageByName[product.name]
}));

const oralCareProducts: Product[] = [
  { name: "ยาสีฟัน Colgate ผสมสมุนไพร", unit: "หลอด" },
  { name: "ยาสีฟัน Colgate สูตรสมุนไพร (กล่องเขียว)", unit: "หลอด" },
  { name: "ยาสีฟันสมุนไพร ตราหมอจุฬา", unit: "หลอด" },
  { name: "ยาสีฟันสมุนไพร เทพไทย", unit: "หลอด" },
  { name: "ยาสีฟันสมุนไพร เทพไทย รสมิกซ์ฟรุ๊ต", unit: "หลอด" },
  { name: "น้ำยาบ้วนปาก Colgate Plax", unit: "ขวด" },
  { name: "น้ำยาบ้วนปาก Listerine Kids", unit: "ขวด" },
  { name: "น้ำยาบ้วนปาก Listerine Total Care", unit: "ขวด" },
  { name: "น้ำยาบ้วนปาก Mybacin สูตรฟลูออไรด์", unit: "ขวด", sizeLabel: "250 มล." },
  { name: "น้ำยาบ้วนปาก Mybacin สูตรออริจินัล", unit: "ขวด", sizeLabel: "750 มล." },
  { name: "น้ำยาบ้วนปาก Mybacin สูตรไวท์ โพรเทค", unit: "ขวด", sizeLabel: "250 มล." },
  { name: "น้ำยาบ้วนปาก Oral-B 3D White", unit: "ขวด" },
  { name: "น้ำยาบ้วนปาก MONDAHMIN Advanced Care (สีม่วง)", unit: "ขวด", sizeLabel: "550 มล." },
  { name: "น้ำยาบ้วนปาก MONDAHMIN Freshmint (สีเขียว)", unit: "ขวด", sizeLabel: "550 มล." },
  { name: "ศิริราช น้ำยาบ้วนปาก (สีชมพู)", unit: "ขวด" },
  { name: "ศิริราช น้ำยาบ้วนปาก รสมิ้นต์ (สีเขียว)", unit: "ขวด" },
  { name: "ยาป้ายปาก คาโนโลน แผลในปาก (Kanolone)", unit: "หลอด", sizeLabel: "แผลในปาก · 1 กรัม" },
  { name: "ยาป้ายปาก ไตรโนโลน แก้ร้อนใน (Trinolone)", unit: "หลอด", sizeLabel: "แผลในปาก ร้อนใน" }
].map((product, index) => ({
  id: 16000 + index,
  category: "สุขภาพ/สวย",
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
  ...hairCareProducts,
  ...insectRepellentProducts,
  ...rollOnProducts,
  ...snackProducts,
  ...chocolateProducts,
  ...medicineProducts,
  ...firstAidProducts,
  ...oralCareProducts,
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
const beverageSubcategories = ["ทั้งหมด", "น้ำดื่ม/น้ำแร่", "น้ำอัดลม/โซดา", "น้ำผลไม้", "เจเล่พร้อมดื่ม", "ชา", "กาแฟ", "สุขภาพ", "ชูกำลัง/เกลือแร่"] as const;
type BeverageSubcategory = (typeof beverageSubcategories)[number];

const beverageSubcategoryKeywords: Record<Exclude<BeverageSubcategory, "ทั้งหมด">, string[]> = {
  "น้ำดื่ม/น้ำแร่": ["น้ำทิพย์", "น้ำวีด้า", "น้ำดื่ม", "คริสตัล"],
  "น้ำอัดลม/โซดา": ["สิงห์", "โซดา", "เป๊บซี่", "โค้ก", "แฟนต้า", "มิรินด้า", "เซเว่นอัป", "สไปรท์"],
  น้ำผลไม้: ["น้ำผลไม้", "มาลี", "ทิปโก้", "ดอยคำ", "ดีโด้", "ยูนิฟ", "กาโตะ", "สแปลช", "Splash", "มินิทเมด", "Minute Maid", "น้ำส้ม", "น้ำองุ่น", "น้ำแอปเปิ้ล", "น้ำมะพร้าว", "น้ำลิ้นจี่", "สับปะรด"],
  เจเล่พร้อมดื่ม: ["เจเล่", "Jele", "เยลลี่พร้อมดื่ม", "เจลลี่พร้อมดื่ม", "บิวติ", "Beautie"],
  ชา: ["เย็นเย็น", "น้ำจับใจ", "โออิชิ", "อิชิตัน"],
  กาแฟ: ["เนสกาแฟ", "กาแฟเบอร์ดี้", "กาแฟ"],
  สุขภาพ: ["ยันฮี", "แบรนด์", "วีด้า"],
  "ชูกำลัง/เกลือแร่": ["M150", "ลิโพ", "กระทิงแดง", "คาราบาว", "โสมเกาหลี", "สปอนเซอร์"]
};

function matchesBeverageSubcategory(product: Product, subcategory: BeverageSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  // เจเล่เป็นเยลลี่พร้อมดื่ม ไม่ให้ไปโผล่ในหัวข้อน้ำผลไม้/อื่นๆ
  const isJele = beverageSubcategoryKeywords["เจเล่พร้อมดื่ม"].some((keyword) => product.name.includes(keyword));
  if (isJele) {
    return subcategory === "เจเล่พร้อมดื่ม";
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
  const isSour = ["นมเปรี้ยว", "เปรี้ยว", "ยาคูลท์", "Yakult", "ดัชมิลล์", "Dutch Mill", "บีทาเก้น", "Betagen", "ดีไลท์"].some((keyword) =>
    searchableMilkText.includes(keyword)
  );
  const isYogurt = ["โยเกิร์ต", "Yogurt", "โยเกิ"].some((keyword) => searchableMilkText.includes(keyword));

  // จัดตามลำดับความสำคัญ — สินค้าหนึ่งชิ้นอยู่หัวข้อเดียว
  // โยเกิร์ตต้องมาก่อนนมเปรี้ยว ไม่งั้น "ดัชชี่ โยเกิร์ต..." จะไปโผล่ทั้งสองที่
  if (isYogurt) {
    return subcategory === "โยเกิร์ต";
  }

  if (isSoy) {
    return subcategory === "นมถั่วเหลือง / น้ำเต้าหู้";
  }

  if (isSour) {
    return subcategory === "นมเปรี้ยว";
  }

  if (subcategory !== "นม") {
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
  "แชมพู / ครีมนวด",
  "สบู่ / เจลอาบน้ำ",
  "โลชั่น / ครีมบำรุง",
  "ออยล์",
  "แป้ง",
  "โรลออน",
  "น้ำหอม",
  "ครีมทาหน้า",
  "เซรั่ม",
  "วิตามินบำรุงผิว",
  "ป้องกันแมลง",
  "ดูแลช่องปาก",
  "แม่และเด็ก"
] as const;
type HealthBeautySubcategory = (typeof healthBeautySubcategories)[number];

const healthBeautySubcategoryKeywords: Record<Exclude<HealthBeautySubcategory, "ทั้งหมด">, string[]> = {
  ยาและเวชภัณฑ์: ["ยา", "เวชภัณฑ์", "พารา", "พาราเซตามอล", "แก้ปวด", "ลดไข้", "ยาแก้", "ยาหม่อง", "ยาดม"],
  อุปกรณ์สุขภาพ: ["อุปกรณ์สุขภาพ", "ปรอท", "เทอร์โมมิเตอร์", "เครื่องวัด", "หน้ากาก", "แมสก์", "ถุงมือ"],
  "แชมพู / ครีมนวด": ["แชมพู", "ยาสระผม", "ครีมนวด", "คอนดิชันเนอร์", "Shampoo", "Conditioner", "บำรุงผม"],
  "สบู่ / เจลอาบน้ำ": ["สบู่", "เจลอาบน้ำ", "ครีมอาบน้ำ", "ชาวเวอร์", "Shower", "Soap"],
  "โลชั่น / ครีมบำรุง": ["โลชั่น", "Lotion", "ครีมบำรุงผิว", "บำรุงผิวกาย", "บอดี้", "Body"],
  ออยล์: ["ออยล์", "Oil", "ออยล์บำรุง", "เบบี้ออยล์", "น้ำมันมะพร้าว", "น้ำมันมะกอก", "น้ำมันบำรุง", "น้ำมันนวด"],
  แป้ง: ["แป้ง", "แป้งฝุ่น", "แป้งเย็น", "แป้งทาตัว", "แป้งเด็ก", "แป้งพัฟ", "Powder"],
  โรลออน: ["โรลออน", "Roll On", "Roll-on", "ระงับกลิ่นกาย", "ดับกลิ่นกาย", "Deodorant"],
  น้ำหอม: ["น้ำหอม", "Perfume", "โคโลญ", "Cologne", "EDT", "EDP"],
  ครีมทาหน้า: ["ครีมทาหน้า", "ครีมหน้า", "บำรุงหน้า", "บำรุงผิวหน้า", "มอยส์เจอร์", "Moistur", "กันแดด", "Sunscreen"],
  เซรั่ม: ["เซรั่ม", "เซรัม", "Serum", "เอสเซนส์", "Essence"],
  วิตามินบำรุงผิว: ["วิตามิน", "Vitamin", "คอลลาเจน", "Collagen", "กลูต้า", "Gluta", "อาหารเสริมผิว"],
  ป้องกันแมลง: ["ป้องกันแมลง", "ยากันยุง", "กันยุง", "ไล่ยุง", "แมลง", "สเปรย์กันยุง"],
  ดูแลช่องปาก: ["ดูแลช่องปาก", "แปรงสีฟัน", "ยาสีฟัน", "น้ำยาบ้วนปาก", "ไหมขัดฟัน", "ช่องปาก", "ป้ายปาก", "แผลในปาก"],
  แม่และเด็ก: ["แม่และเด็ก", "เด็ก", "ทารก", "แพมเพิร์ส", "ผ้าอ้อม", "ขวดนม", "จุกนม", "แป้งเด็ก"]
};

// ลำดับความสำคัญในการจัดหัวข้อย่อย — สินค้าหนึ่งชิ้นจะอยู่หัวข้อ "แรกสุด" ที่ตรงเท่านั้น
// ต้องเรียงจากเฉพาะเจาะจงไปกว้าง ไม่งั้นชื่อจะไปตกหัวข้ออื่น เช่น
// "โรลออน Tech Perfume" ต้องอยู่ "โรลออน" ไม่ใช่ "น้ำหอม",
// "โลชั่นกันยุง" ต้องอยู่ "ป้องกันแมลง" ไม่ใช่ "โลชั่น / ครีมบำรุง"
const healthBeautySubcategoryPriority: Exclude<HealthBeautySubcategory, "ทั้งหมด">[] = [
  "ป้องกันแมลง",
  "โรลออน",
  "ดูแลช่องปาก",
  "แชมพู / ครีมนวด",
  "สบู่ / เจลอาบน้ำ",
  "แป้ง",
  "น้ำหอม",
  "เซรั่ม",
  "ครีมทาหน้า",
  "ออยล์",
  "โลชั่น / ครีมบำรุง",
  "วิตามินบำรุงผิว",
  "อุปกรณ์สุขภาพ",
  "ยาและเวชภัณฑ์",
  "แม่และเด็ก"
];

function matchesHealthBeautySubcategory(product: Product, subcategory: HealthBeautySubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchableHealthBeautyText = `${product.name} ${product.sizeLabel ?? ""}`;
  const matched = healthBeautySubcategoryPriority.find((candidate) =>
    healthBeautySubcategoryKeywords[candidate].some((keyword) => searchableHealthBeautyText.includes(keyword))
  );

  return matched === subcategory;
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
  "ภูมิแพ้": ["ภูมิแพ้", "แก้แพ้", "แพ้อากาศ", "คลอเฟนิรามีน", "Chlorpheniramine", "CPM", "ลอราทาดีน", "Loratadine", "เซทิริซีน", "Cetirizine", "แอนตี้ฮีสตามีน", "ลมพิษ", "อัลเลอร์นิค", "Allernix"],
  "ผิวหนัง / แมลงกัดต่อย": ["ผิวหนัง", "แมลงกัด", "แมลงสัตว์กัดต่อย", "ยุงกัด", "ทาแก้คัน", "แก้คัน", "คาลาไมน์", "Calamine", "ผื่น", "เชื้อรา", "กลาก", "เกลื้อน", "เบตาดีน", "Betadine", "ยาแดง", "ยาม่วง", "เจนเชียน", "ใส่แผล", "ครีมทาแผล", "ยากันยุง", "กันยุง", "เสลดพังพอน", "พญายอ", "คาดรามีน", "Cadramine", "คาเนสเทน", "Canesten", "ไลมาริน", "Lymarin", "คีล่า", "Kela", "ไดโป", "Dipo", "ฟังจิเดอร์ม", "Fungiderm", "ซีมา", "Zema", "ฮ่องกงฟุต", "โทนาฟ", "TONAF", "ไมโครัล", "โคลไทรมาโซล", "Clotrimazole", "แฟงโก้", "Fango", "เดอร์มาติกซ์", "Dermatix", "แผลเป็น"],
  "ปวดเมื่อย": ["ปวดเมื่อย", "ปวดกล้ามเนื้อ", "ปวดข้อ", "ปวดหลัง", "ปวดเอว", "เคาน์เตอร์เพน", "Counterpain", "ยานวด", "เจลนวด", "แผ่นแปะ", "แปะแก้ปวด", "ซาลอนพาส", "Salonpas"],
  "ยาสมุนไพร / บรรเทาอาการ": ["สมุนไพร", "ฟ้าทะลายโจร", "ขิง", "กระชาย", "ยาเขียว", "ยาหอม", "ประสะ", "ยาลม", "ยาต้ม", "ยาผง", "มะขามแขก", "ชาสมุนไพร", "กษัยเส้น", "เขากุ้ย", "Kao-Kui", "อภัยภูเบศร"],
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

const cannedFoodCategory = "อาหารกระป๋อง";
const cannedFoodSubcategories = [
  "ทั้งหมด",
  "ปลากระป๋อง",
  "ทูน่ากระป๋อง",
  "หอยกระป๋อง",
  "ผลไม้กระป๋อง",
  "ผักกระป๋อง",
  "อาหารพร้อมทาน",
  "น้ำพริกกระป๋อง"
] as const;
type CannedFoodSubcategory = (typeof cannedFoodSubcategories)[number];

const cannedFoodSubcategoryKeywords: Record<Exclude<CannedFoodSubcategory, "ทั้งหมด">, string[]> = {
  ปลากระป๋อง: ["ปลากระป๋อง", "ปลาซาร์ดีน", "ซาร์ดีน", "ปลาแมคเคอเรล", "แมคเคอเรล", "ปลาในซอส", "ปุ้มปุ้ย", "โรซ่า", "สามแม่ครัว", "นกพิราบ"],
  ทูน่ากระป๋อง: ["ทูน่า", "Tuna", "ซีเล็ค", "Sealect", "เนเชอรัล ทูน่า"],
  หอยกระป๋อง: ["หอยกระป๋อง", "หอยลาย", "หอยแมลงภู่", "หอยนางรม", "หอยเชลล์", "หอยตลับ"],
  ผลไม้กระป๋อง: ["ผลไม้กระป๋อง", "ลำไยกระป๋อง", "ลิ้นจี่กระป๋อง", "เงาะกระป๋อง", "สับปะรดกระป๋อง", "ผลไม้รวมกระป๋อง", "ลอยแก้ว"],
  ผักกระป๋อง: ["ผักกระป๋อง", "ข้าวโพดหวาน", "ข้าวโพดกระป๋อง", "เห็ดฟาง", "หน่อไม้", "ผักรวม", "ถั่วลันเตา"],
  อาหารพร้อมทาน: ["พร้อมทาน", "แกงเขียวหวาน", "พะแนง", "ผัดเผ็ด", "สปาเก็ตตี้", "แฮม", "หมูสับ", "ไส้กรอก", "โจ๊ก", "ข้าวต้ม"],
  น้ำพริกกระป๋อง: ["น้ำพริก", "พริกเผา", "น้ำพริกเผา", "น้ำพริกนรก", "น้ำพริกปลาย่าง"]
};

function matchesCannedFoodSubcategory(product: Product, subcategory: CannedFoodSubcategory) {
  if (subcategory === "ทั้งหมด") {
    return true;
  }

  const searchableCannedFoodText = `${product.name} ${product.sizeLabel ?? ""}`;
  // จัดตามลำดับ — สินค้าหนึ่งชิ้นอยู่หัวข้อเดียว (ทูน่าต้องมาก่อนปลากระป๋อง)
  const matched = (
    ["น้ำพริกกระป๋อง", "ทูน่ากระป๋อง", "หอยกระป๋อง", "ปลากระป๋อง", "ผลไม้กระป๋อง", "ผักกระป๋อง", "อาหารพร้อมทาน"] as const
  ).find((candidate) =>
    cannedFoodSubcategoryKeywords[candidate].some((keyword) => searchableCannedFoodText.includes(keyword))
  );

  return matched === subcategory;
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
  const isWash = [
    "ทำความสะอาด",
    "จุดซ่อนเร้น",
    "เฟมินิน",
    "Feminine",
    "Intimate",
    "Ladycare",
    "Lady Care",
    "Hygien",
    "Saugella",
    "Lactacyd"
  ].some((keyword) => searchablePersonalCareText.includes(keyword));

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

/** คีย์ประจำสินค้าแต่ละแบบ (ชื่อ + ป้ายขนาด) — ต้องตรงกับฝั่ง backend */
function productVariantKey(name: string, sizeLabel?: string | null) {
  return `${name.trim()}|${(sizeLabel ?? "").trim()}`;
}

/**
 * ทับรูปสินค้าด้วยรูปที่เก็บไว้ในเครื่อง (cache ตอนออฟไลน์)
 *
 * ⚠️ รูปจากคลังกลางของ backend (`/images/...`) คือแหล่งความจริง — ห้ามให้ cache ในเครื่องทับ
 * cache จะใช้ก็ต่อเมื่อสินค้าตัวนั้นยังไม่มีรูปจากเซิร์ฟเวอร์
 */
function applyImageOverrides(productList: Product[], overrides: Record<string, string>) {
  if (Object.keys(overrides).length === 0) {
    return productList;
  }

  return productList.map((product) => {
    if (product.imageUrl?.startsWith("/images/")) {
      return product;
    }

    const overrideUrl = overrides[productVariantKey(product.name, product.sizeLabel)];

    return overrideUrl && product.imageUrl !== overrideUrl
      ? { ...product, imageUrl: overrideUrl }
      : product;
  });
}

function mergeSavedProducts(savedProducts: Product[]) {
  const hydratedProducts = savedProducts
    .filter((product) => typeof product.id === "number")
    .map((product) => hydrateProduct(product))
    .filter((product) => product.name !== "บุหรี่ซองแดง")
    .filter((product) => product.name !== "น้ำแข็ง 5 บาท")
    .filter((product) => !product.name.startsWith("ตาวัน"))
    .filter(
      (product) =>
        !(product.name === "ยากษัยเส้น ตราเด็กในพานทอง" && (product.sizeLabel ?? "").includes("ซอง"))
    )
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

/**
 * รูปประจำตัวคน — รองรับทั้งรูปสำเร็จรูป ("preset:cat") และรูปที่อัปเอง
 *
 * รูปที่อัปเองเป็น path จาก API (`/images/...`) ต้องต่อ API_BASE ก่อนใช้เป็น src
 * และใช้ <img> ธรรมดาเพราะ next/image ไม่รับ data URL (ตอนออฟไลน์ยังเป็น data URL อยู่)
 */
function StaffAvatarMark({ avatar, size = 32 }: { avatar?: string | null; size?: number }) {
  if (avatar && !avatar.startsWith(presetPrefix)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="staff-avatar-image"
        src={resolveImageUrl(avatar)}
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "cover", borderRadius: "50%" }}
      />
    );
  }

  return <>{renderPresetAvatar(avatar ?? presetAvatarValue("cat"), size)}</>;
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
  const [cannedFoodSubcategory, setCannedFoodSubcategory] = useState<CannedFoodSubcategory>("ทั้งหมด");
  const [status, setStatus] = useState<"ทั้งหมด" | StockStatus>("ทั้งหมด");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [previewBanner, setPreviewBanner] = useState<{ imageUrl: string; title: string } | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  // กำลังอัปโหลดรูปอยู่ไหม (ใช้แสดง spinner บนปุ่ม)
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // รูปที่พนักงานอัปโหลดไว้ เก็บใน ref เพราะต้องใช้ทับรูปทุกครั้งที่โหลดสินค้าใหม่
  const imageOverridesRef = useRef<Record<string, string>>({});
  // รูปประจำตัวของคนที่ล็อกอินอยู่ ("preset:cat" หรือ URL รูปที่อัปเอง)
  const [staffAvatar, setStaffAvatar] = useState<string | null>(null);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [shopImageUrl, setShopImageUrl] = useState(defaultShopImageUrl);
  const [staffName, setStaffName] = useState<string | null>(null);
  // username ของคนที่ล็อกอินอยู่ (ต่างจาก staffName ที่เป็นชื่อไว้แสดง)
  const [staffUsername, setStaffUsername] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginForm] = Form.useForm<{ username: string; password: string }>();
  // รายชื่อคนในบ้านจาก GET /users — ใช้ทำปุ่มเลือกคนตอนล็อกอิน
  const [staffUsers, setStaffUsers] = useState<ApiUser[]>([]);
  const [pickedUser, setPickedUser] = useState<ApiUser | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm] = Form.useForm<{ displayName: string }>();
  const [passwordForm] = Form.useForm<{ currentPassword: string; newPassword: string }>();
  const isStaff = staffName !== null;
  const categoryRowRef = useRef<HTMLDivElement>(null);
  const [form] = Form.useForm<ProductFormValues>();

  useEffect(() => {
    const savedVersion = window.localStorage.getItem(productsDataVersionKey);
    const savedProducts = window.localStorage.getItem(storageKey);

    if (savedProducts && savedVersion === productsDataVersion) {
      const parsedProducts = JSON.parse(savedProducts) as Product[];

      setProducts(mergeSavedProducts(parsedProducts));
    }

    // เวอร์ชันไม่ตรง = ล้างของเก่า ใช้ catalog ใหม่จากโค้ด แล้วบันทึกเวอร์ชันปัจจุบัน
    window.localStorage.setItem(productsDataVersionKey, productsDataVersion);

    const savedSearchHistory = window.localStorage.getItem(searchHistoryStorageKey);

    if (savedSearchHistory) {
      setSearchHistory(JSON.parse(savedSearchHistory) as string[]);
    }

    const savedShopImage = window.localStorage.getItem(shopImageStorageKey);

    if (savedShopImage) {
      setShopImageUrl(savedShopImage);
    }

    // ชื่อที่จำไว้ในเครื่อง ใช้แสดงชั่วคราวระหว่างรอ /auth/me ตอบ (กันหัวเว็บกระพริบ)
    const savedStaffName = window.localStorage.getItem(authStorageKey);

    if (savedStaffName && getToken()) {
      setStaffName(savedStaffName);
    }

    // รายชื่อคนในบ้าน ไว้ทำปุ่มเลือกคนตอนล็อกอิน
    apiFetchUsers()
      .then(setStaffUsers)
      .catch(() => {
        // ต่อ API ไม่ได้ — ยังพิมพ์ชื่อผู้ใช้เองได้อยู่
      });

    // เช็คว่า token ที่เก็บไว้ยังใช้ได้ไหม แล้วดึงชื่อ/รูปล่าสุดจากเซิร์ฟเวอร์
    apiFetchMe()
      .then((user) => {
        if (!user) {
          // token หมดอายุ/ถูกล้าง — ล้างสถานะล็อกอินฝั่งเครื่องให้ตรงกัน
          clearToken();
          window.localStorage.removeItem(authStorageKey);
          setStaffName(null);
          setStaffUsername(null);
          return;
        }

        setStaffName(user.displayName);
        setStaffUsername(user.username);
        window.localStorage.setItem(authStorageKey, user.displayName);

        if (user.avatarUrl) {
          setStaffAvatar(user.avatarUrl);
        }
      })
      .catch(() => {
        // ต่อ API ไม่ได้ — คงสถานะเดิมไว้ก่อน ไม่เตะผู้ใช้ออกเพราะเน็ตหลุด
      });

    // โหลดสินค้าจาก backend มารวมกับแคตตาล็อกในโค้ด (ยึดค่าจาก server เป็นหลักเมื่อชื่อตรงกัน)
    // ถ้าต่อ backend ไม่ได้ จะใช้ข้อมูลจาก localStorage/แคตตาล็อกในโค้ดแทน (กันจอว่าง)
    apiFetchProducts()
      .then((serverProducts) => {
        if (serverProducts.length === 0) {
          return;
        }

        setProducts((currentProducts) => {
          const serverByKey = new Map(
            serverProducts.map((item) => [productVariantKey(item.name, item.sizeLabel), item])
          );
          const matchedKeys = new Set<string>();
          const mergedProducts = currentProducts.map((product) => {
            const key = productVariantKey(product.name, product.sizeLabel);
            const serverProduct = serverByKey.get(key);

            if (!serverProduct) {
              return product;
            }

            matchedKeys.add(key);

            return {
              ...product,
              ...serverProduct,
              imageUrl: serverProduct.imageUrl ?? product.imageUrl
            } as Product;
          });
          // สินค้าที่มีเฉพาะบนเซิร์ฟเวอร์ (พนักงานเพิ่งเพิ่ม) เอามาต่อไว้ด้านบน
          const serverOnlyProducts = serverProducts.filter(
            (item) => !matchedKeys.has(productVariantKey(item.name, item.sizeLabel))
          ) as Product[];

          return applyImageOverrides(
            [...serverOnlyProducts, ...mergedProducts],
            imageOverridesRef.current
          );
        });
      })
      .catch(() => {
        // เงียบไว้ — fallback เป็นข้อมูล local ที่โหลดไว้แล้ว
      });

    // โหลดรูปที่เก็บไว้ในเครื่อง (รูปสินค้า + รูปประจำตัว) แล้วทับรูปเดิมจากแคตตาล็อก
    readAllImages()
      .then((storedImages) => {
        const overrides: Record<string, string> = {};

        Object.entries(storedImages).forEach(([key, value]) => {
          if (key.startsWith(productImagePrefix)) {
            overrides[key.slice(productImagePrefix.length)] = value;
          }
        });

        imageOverridesRef.current = overrides;
        setProducts((currentProducts) => applyImageOverrides(currentProducts, overrides));
        // รูปประจำตัวจาก /auth/me มาก่อนเสมอ — ค่าในเครื่องเป็นแค่ตัวสำรองตอนยังไม่ได้คำตอบ
        setStaffAvatar((current) => current ?? storedImages[avatarStorageKey] ?? null);
      })
      .catch(() => {
        // เงียบไว้ — ยังใช้รูปเดิมจากแคตตาล็อกได้
      });
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
                                      : category === cannedFoodCategory
                                        ? item.category === cannedFoodCategory && matchesCannedFoodSubcategory(item, cannedFoodSubcategory)
                                        : item.category === category);
      const matchesStatus = status === "ทั้งหมด" || itemStatus === status;

      return matchesText && matchesCategory && matchesStatus;
    }).sort(sortProducts);
  }, [alcoholSubcategory, beverageSubcategory, candySubcategory, cannedFoodSubcategory, category, dryFoodSubcategory, eggSubcategory, firstAidSubcategory, healthBeautySubcategory, herbalDrinkSubcategory, householdSubcategory, instantNoodleSubcategory, meatSubcategory, medicineSubcategory, milkSubcategory, personalCareSubcategory, petSubcategory, products, query, status, supplementSubcategory]);

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

  // ย่อรูปที่เลือกมาแล้วส่งขึ้นคลังรูปกลางของ backend — คืน path เช่น "/images/<sha256>.jpg"
  // ถ้าอัปไม่ได้ (เช่นเน็ตหลุด) จะคืน data URL ไว้ใช้ในเครื่องไปก่อน
  async function preparePickedImage(
    file: File,
    kind: "product" | "avatar" = "product"
  ): Promise<string | null> {
    setIsUploadingImage(true);

    try {
      const compressed = await compressImage(file);

      try {
        const uploaded = await apiUploadImage(compressed, kind);
        return uploaded.url;
      } catch (uploadError) {
        // อัปขึ้นเซิร์ฟเวอร์ไม่ได้ — ใช้รูปในเครื่องไปก่อน แต่ต้องบอกให้รู้ว่าคนอื่นยังไม่เห็น
        message.warning(
          uploadError instanceof Error
            ? `${uploadError.message} — เก็บรูปไว้ในเครื่องก่อน คนอื่นจะยังไม่เห็น`
            : "อัปโหลดรูปขึ้นเซิร์ฟเวอร์ไม่สำเร็จ — เก็บรูปไว้ในเครื่องก่อน"
        );
        return await fileToDataUrl(compressed);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "อ่านรูปไม่สำเร็จ");
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  }

  const uploadProps: UploadProps = {
    accept: "image/*",
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void preparePickedImage(file).then((url) => {
        if (url) {
          setImageUrl(url);
        }
      });

      // คืน false เพื่อไม่ให้ antd อัปโหลดเอง — เราจัดการเองด้านบนแล้ว
      return false;
    }
  };

  // ---- รูปประจำตัวพนักงาน — เก็บบนเซิร์ฟเวอร์ (PATCH /auth/me) ให้ทุกเครื่องเห็นตรงกัน ----
  async function chooseAvatar(avatar: string) {
    try {
      await apiUpdateMe({ avatarUrl: avatar });
    } catch (error) {
      message.error(error instanceof Error ? error.message : "บันทึกรูปประจำตัวไม่สำเร็จ");
      return;
    }

    setStaffAvatar(avatar);
    setIsAvatarOpen(false);
    message.success("เปลี่ยนรูปประจำตัวแล้ว");

    // เก็บสำเนาไว้ในเครื่องเป็น cache ตอนออฟไลน์
    void writeImage(avatarStorageKey, avatar).catch(() => undefined);
  }

  const staffAvatarUploadProps: UploadProps = {
    accept: "image/*",
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void preparePickedImage(file, "avatar").then((url) => {
        if (url) {
          void chooseAvatar(url);
        }
      });

      return false;
    }
  };

  // รูปที่อัปเองจะเป็น URL ส่วนรูปสำเร็จรูปขึ้นต้นด้วย preset:
  const hasUploadedAvatar = Boolean(staffAvatar && !staffAvatar.startsWith(presetPrefix));

  // เปลี่ยนรูปของสินค้าที่มีอยู่แล้ว (พนักงานที่ล็อกอินเท่านั้น)
  const productImageUploadProps: UploadProps = {
    accept: "image/*",
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void changeProductImage(file);

      return false;
    }
  };

  async function changeProductImage(file: File) {
    const product = selectedProduct;

    if (!product) {
      return;
    }

    const url = await preparePickedImage(file);

    if (!url) {
      return;
    }

    const key = productVariantKey(product.name, product.sizeLabel);

    // ผูกรูปกับสินค้าบนเซิร์ฟเวอร์ — นี่คือแหล่งความจริง ทุกเครื่องจะเห็นรูปเดียวกัน
    try {
      await apiUpdateProduct(product.id, { imageUrl: url });
    } catch (error) {
      message.error(error instanceof Error ? error.message : "บันทึกรูปสินค้าไม่สำเร็จ");
      return;
    }

    // เก็บสำเนาไว้ในเครื่องเป็น cache ตอนออฟไลน์
    void writeImage(`${productImagePrefix}${key}`, url).catch(() => undefined);

    imageOverridesRef.current = { ...imageOverridesRef.current, [key]: url };
    setProducts((currentProducts) =>
      currentProducts.map((item) =>
        productVariantKey(item.name, item.sizeLabel) === key ? { ...item, imageUrl: url } : item
      )
    );
    setSelectedProduct({ ...product, imageUrl: url });
    message.success("เปลี่ยนรูปสินค้าเรียบร้อย");
  }

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

  async function handleLogin(values: { username: string; password: string }) {
    try {
      const result = await apiLogin(values.username.trim(), values.password);

      setToken(result.token);
      setStaffName(result.displayName);
      setStaffUsername(result.username);
      setStaffAvatar(result.avatarUrl ?? null);
      window.localStorage.setItem(authStorageKey, result.displayName);
      setIsLoginOpen(false);
      setPickedUser(null);
      loginForm.resetFields();
      message.success(`เข้าสู่ระบบในชื่อ ${result.displayName}`);

      // ย้ายรูปเก่าที่เคยเก็บไว้ในเครื่องขึ้นคลังกลาง (ทำครั้งเดียวต่อคน อัปซ้ำไม่พัง)
      void runImageMigration(result.username);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ");
    }
  }

  /** ย้ายรูปเก่าใน IndexedDB ขึ้น API แล้วรีเฟรชรายการสินค้าให้เห็นผลทันที */
  async function runImageMigration(username: string) {
    try {
      const result = await migrateLocalImages(username, products);

      if (result.products === 0 && !result.avatar) {
        return;
      }

      const moved = [
        result.products > 0 ? `รูปสินค้า ${result.products} รูป` : null,
        result.avatar ? "รูปประจำตัว" : null
      ]
        .filter(Boolean)
        .join(" และ ");

      message.success(`ย้าย${moved}ขึ้นเซิร์ฟเวอร์แล้ว ตอนนี้คนอื่นเห็นด้วย`);

      const refreshed = await apiFetchMe().catch(() => null);
      if (refreshed?.avatarUrl) {
        setStaffAvatar(refreshed.avatarUrl);
      }
    } catch {
      // ย้ายไม่สำเร็จก็ไม่เป็นไร รูปยังอยู่ในเครื่อง ลองใหม่รอบล็อกอินหน้า
    }
  }

  async function handleLogout() {
    await apiLogout();
    setStaffName(null);
    setStaffUsername(null);
    setStaffAvatar(null);
    window.localStorage.removeItem(authStorageKey);
    setIsAddOpen(false);
    setIsProfileOpen(false);
    message.success("ออกจากระบบแล้ว");
  }

  // ---- แก้โปรไฟล์: ชื่อที่แสดง / รหัสผ่าน ----
  function openProfile() {
    profileForm.setFieldsValue({ displayName: staffName ?? "" });
    passwordForm.resetFields();
    setIsProfileOpen(true);
  }

  async function saveDisplayName(values: { displayName: string }) {
    try {
      const updated = await apiUpdateMe({ displayName: values.displayName.trim() });

      setStaffName(updated.displayName);
      window.localStorage.setItem(authStorageKey, updated.displayName);
      message.success("เปลี่ยนชื่อที่แสดงแล้ว");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "บันทึกชื่อไม่สำเร็จ");
    }
  }

  async function submitPasswordChange(values: { currentPassword: string; newPassword: string }) {
    try {
      await apiChangePassword(values.currentPassword, values.newPassword);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      return;
    }

    // เปลี่ยนรหัสแล้ว session เดิมถูกล้าง ต้องล็อกอินใหม่
    clearToken();
    window.localStorage.removeItem(authStorageKey);
    setStaffName(null);
    setStaffUsername(null);
    setStaffAvatar(null);
    setIsProfileOpen(false);
    passwordForm.resetFields();
    setIsLoginOpen(true);
    message.success("เปลี่ยนรหัสผ่านแล้ว — กรุณาเข้าสู่ระบบใหม่");
  }

  async function addProduct(values: ProductFormValues) {
    try {
      const created = await apiCreateProduct({
        ...values,
        category: normalizeCategory(values.category),
        imageUrl: imageUrl || undefined
      });

      setProducts((currentProducts) => [created as Product, ...currentProducts]);
      setCategory("ทั้งหมด");
      setStatus("ทั้งหมด");
      closeAddModal();
      message.success("เพิ่มสินค้าเรียบร้อย");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "เพิ่มสินค้าไม่สำเร็จ");
    }
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

    if (nextCategory !== cannedFoodCategory) {
      setCannedFoodSubcategory("ทั้งหมด");
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
                  unoptimized
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
              {isStaff ? (
                <button
                  className={`brand-mark${hasUploadedAvatar ? " has-image" : ""}`}
                  type="button"
                  aria-label="เลือกรูปประจำตัว"
                  onClick={() => setIsAvatarOpen(true)}
                >
                  {hasUploadedAvatar ? (
                    // รูปเก็บเป็น data URL ในเครื่อง จึงใช้ img ธรรมดา (next/image ไม่รับ data URL)
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="รูปประจำตัวพนักงาน"
                      className="brand-mark-image"
                      src={resolveImageUrl(staffAvatar as string)}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover"
                      }}
                    />
                  ) : (
                    renderPresetAvatar(staffAvatar ?? presetAvatarValue("cat"), 28)
                  )}
                  <span className="brand-mark-edit" aria-hidden="true">
                    <EditOutlined />
                  </span>
                </button>
              ) : null}
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
                  <Button aria-label="แก้โปรไฟล์" icon={<UserOutlined />} onClick={openProfile} />
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
                      unoptimized
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

        {category === cannedFoodCategory ? (
          renderSubcategoryScroller("หัวข้อย่อยอาหารกระป๋อง", cannedFoodSubcategories, cannedFoodSubcategory, setCannedFoodSubcategory)
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
                          src={resolveImageUrl(item.imageUrl)}
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
        destroyOnHidden
        footer={null}
        open={isAvatarOpen}
        title="รูปประจำตัว"
        onCancel={() => setIsAvatarOpen(false)}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {avatarPresets.map((preset) => {
            const value = presetAvatarValue(preset.id);
            const isSelected = staffAvatar === value;

            return (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                onClick={() => void chooseAvatar(value)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "10px 2px",
                  borderRadius: 14,
                  cursor: "pointer",
                  background: isSelected ? "#f3e7d3" : "transparent",
                  border: `2px solid ${isSelected ? "#b07a4e" : "transparent"}`
                }}
              >
                <preset.Icon size={40} />
                <span style={{ fontSize: 12, color: "#6f4a2b" }}>{preset.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <Upload {...staffAvatarUploadProps}>
            <Button icon={<UploadOutlined />} loading={isUploadingImage}>
              เพิ่มรูปจากเครื่อง
            </Button>
          </Upload>
        </div>

        <p style={{ marginTop: 10, marginBottom: 0, textAlign: "center", fontSize: 12, color: "#8a6b4f" }}>
          บนมือถือจะเลือกได้ทั้งถ่ายรูปใหม่และเลือกจากคลังภาพ
        </p>
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
                src={resolveImageUrl(selectedProduct.imageUrl)}
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
            {isStaff ? (
              <div style={{ marginTop: 12 }}>
                <Upload {...productImageUploadProps}>
                  <Button icon={<UploadOutlined />} loading={isUploadingImage}>
                    {selectedProduct.imageUrl ? "เปลี่ยนรูปสินค้า" : "เพิ่มรูปสินค้า"}
                  </Button>
                </Upload>
              </div>
            ) : null}
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
              <Image alt="รูปสินค้าใหม่" className="upload-preview" preview={false} src={resolveImageUrl(imageUrl)} />
            ) : (
              <div className="upload-placeholder">
                <PictureOutlined />
              </div>
            )}
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} loading={isUploadingImage}>
                เลือกรูปสินค้า
              </Button>
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
        footer={null}
        open={isProfileOpen}
        title="โปรไฟล์ของฉัน"
        onCancel={() => setIsProfileOpen(false)}
      >
        <div className="profile-head">
          <StaffAvatarMark avatar={staffAvatar} size={64} />
          <div>
            <strong>{staffName}</strong>
            <p className="tiny-text">ชื่อผู้ใช้: {staffUsername ?? "-"}</p>
          </div>
          <Button
            onClick={() => {
              setIsProfileOpen(false);
              setIsAvatarOpen(true);
            }}
          >
            เปลี่ยนรูป
          </Button>
        </div>

        <Form form={profileForm} layout="vertical" onFinish={saveDisplayName}>
          <Form.Item
            label="ชื่อที่แสดง"
            name="displayName"
            rules={[{ required: true, message: "ชื่อที่แสดงห้ามว่าง" }]}
            extra="ชื่อนี้จะขึ้นเป็น ผู้แก้ไขล่าสุด บนสินค้าที่แก้"
          >
            <Input prefix={<UserOutlined />} placeholder="ชื่อที่แสดง" />
          </Form.Item>
          <Button block type="primary" onClick={() => profileForm.submit()}>
            บันทึกชื่อ
          </Button>
        </Form>

        <div className="profile-divider" />

        <Form form={passwordForm} layout="vertical" onFinish={submitPasswordChange}>
          <Typography.Title level={5}>เปลี่ยนรหัสผ่าน</Typography.Title>
          <Form.Item
            label="รหัสผ่านเดิม"
            name="currentPassword"
            rules={[{ required: true, message: "กรอกรหัสผ่านเดิม" }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            label="รหัสผ่านใหม่"
            name="newPassword"
            rules={[
              { required: true, message: "กรอกรหัสผ่านใหม่" },
              { min: 4, message: "รหัสผ่านใหม่ต้องยาวอย่างน้อย 4 ตัว" }
            ]}
            extra="เปลี่ยนแล้วต้องเข้าสู่ระบบใหม่"
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
          </Form.Item>
          <Button block onClick={() => passwordForm.submit()}>
            เปลี่ยนรหัสผ่าน
          </Button>
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
          {pickedUser ? (
            <StaffAvatarMark avatar={pickedUser.avatarUrl} size={56} />
          ) : (
            <CatMark size={56} />
          )}
        </div>
        <p className="login-hint">
          {pickedUser
            ? `ใส่รหัสผ่านของ ${pickedUser.displayName}`
            : "เข้าสู่ระบบเพื่อจัดการสต็อกและเพิ่มสินค้า (สำหรับพนักงานเท่านั้น)"}
        </p>

        {staffUsers.length > 0 ? (
          <div className="login-user-grid">
            {staffUsers.map((user) => (
              <button
                key={user.username}
                className={`login-user-option${pickedUser?.username === user.username ? " is-selected" : ""}`}
                type="button"
                onClick={() => {
                  setPickedUser(user);
                  loginForm.setFieldsValue({ username: user.username });
                }}
              >
                <StaffAvatarMark avatar={user.avatarUrl} size={40} />
                <span>{user.displayName}</span>
              </button>
            ))}
          </div>
        ) : null}

        <Form form={loginForm} layout="vertical" onFinish={handleLogin}>
          <Form.Item
            label="ชื่อผู้ใช้"
            name="username"
            rules={[{ required: true, message: "กรอกชื่อผู้ใช้" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="ชื่อผู้ใช้"
              autoComplete="username"
              onChange={() => setPickedUser(null)}
            />
          </Form.Item>
          <Form.Item label="รหัสผ่าน" name="password" rules={[{ required: true, message: "กรอกรหัสผ่าน" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="รหัสผ่าน" autoComplete="current-password" onPressEnter={() => loginForm.submit()} />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  );
}
