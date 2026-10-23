import { M_PLUS_1, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mplus = M_PLUS_1({
  variable: "--font-mplus",
  subsets: ["latin"],
  display: "swap",
});

const jbMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "旅行清算アプリ",
  description: "旅行の立て替えを記録して、誰が誰にいくら払うかを自動計算する割り勘アプリ",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ja"
      className={`${mplus.variable} ${jbMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-sky-ground text-ink">{children}</body>
    </html>
  );
}
