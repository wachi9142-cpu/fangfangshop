import type { Metadata, Viewport } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fang Fang Shop",
  description: "ระบบดูสินค้าและสต็อกร้านของชำสำหรับเจ้าของร้านและพนักงาน"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f8fafc"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <AntdRegistry>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: "#0f766e",
                colorInfo: "#2563eb",
                colorSuccess: "#16a34a",
                colorWarning: "#d97706",
                colorError: "#dc2626",
                borderRadius: 8,
                fontFamily:
                  'Arial, "Noto Sans Thai", "Tahoma", "Helvetica Neue", sans-serif'
              },
              components: {
                Button: {
                  controlHeight: 40,
                  borderRadius: 8
                },
                Card: {
                  borderRadiusLG: 8
                },
                Segmented: {
                  itemSelectedBg: "#ffffff"
                }
              }
            }}
          >
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
