import type { Metadata, Viewport } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App as AntdApp, ConfigProvider } from "antd";
import AntdCompat from "./antd-compat";
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
          <AntdCompat>
            <ConfigProvider
            theme={{
              token: {
                colorPrimary: "#b07a4e",
                colorInfo: "#b07a4e",
                colorSuccess: "#6f8a4f",
                colorWarning: "#c1832f",
                colorError: "#c0492c",
                colorBgLayout: "#f3e7d3",
                colorTextBase: "#4a3a2b",
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
                  itemSelectedBg: "#fffdf8"
                }
              }
            }}
          >
              <AntdApp>{children}</AntdApp>
            </ConfigProvider>
          </AntdCompat>
        </AntdRegistry>
      </body>
    </html>
  );
}
