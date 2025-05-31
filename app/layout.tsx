import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Hệ thống Quản lý Chứng chỉ Số | Sui Blockchain",
  description:
    "Nền tảng quản lý, xác minh và phát hành chứng chỉ số minh bạch và bảo mật trên Sui Blockchain.",
  generator: "theanhpro.dev",
  keywords: [
    "Chứng chỉ số",
    "Blockchain",
    "Sui Blockchain",
    "Quản lý chứng chỉ",
    "Xác minh học vấn",
    "Digital Credential",
    "Web3",
  ],
  authors: [{ name: "Phùng Thế Anh", url: "https://github.com/ptanh05" }],
  creator: "Phùng Thế Anh",
  publisher: "Sui Blockchain Project",
  openGraph: {
    title: "Hệ thống Quản lý Chứng chỉ Số trên Sui Blockchain",
    description:
      "Xác minh chứng chỉ minh bạch, không thể giả mạo nhờ công nghệ blockchain.",
    url: "https://your-deployed-site.com",
    siteName: "Sui Certificate Manager",
    images: [
      {
        url: "/CertChain.png",
        width: 1200,
        height: 630,
        alt: "Hệ thống Quản lý Chứng chỉ Số trên Sui Blockchain",
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hệ thống Quản lý Chứng chỉ Số trên Sui Blockchain",
    description:
      "Chứng chỉ số không thể giả mạo nhờ công nghệ Web3 & Blockchain.",
    site: "@GaCon_DiBo",
    creator: "@GaCon_DiBo",
    images: ["https://your-deployed-site.com/og-image.png"],
  },
  metadataBase: new URL("https://your-deployed-site.com"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
