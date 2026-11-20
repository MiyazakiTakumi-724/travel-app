import "./globals.css";
import { OG_IMAGE } from "@/lib/ogImage";

// 和文フォントは next/font だと全サブセットをビルド時に取得して重いので、
// Google Fonts のスタイルシートから必要な文字範囲だけブラウザに読ませる
const fontsHref =
  "https://fonts.googleapis.com/css2?family=M+PLUS+1:wght@700;800&family=Barlow+Semi+Condensed:wght@600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap";

// リンクのプレビュー用の画像などを、本番の URL で出す（Vercel では本番の URL が環境変数で渡される）
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "旅行清算アプリ",
  // リンクを LINE などで送ったときのプレビュー
  openGraph: {
    title: "旅行清算アプリ",
    description: "日程調整から、旅行中の立て替えの記録、誰が誰にいくら払うかの精算まで、みんなで共有できるアプリ",
    siteName: "旅行清算アプリ",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
  description: "旅行の立て替えを記録して、誰が誰にいくら払うかを自動計算する割り勘アプリ",
  // iPhone でホーム画面に追加したときの名前と、全画面表示の設定
  appleWebApp: {
    capable: true,
    title: "旅行清算",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#E2F4FC",
  // iPhone の切り欠きやホームバーの位置まで画面を使い、重なる部分は env(safe-area-inset-*) で避ける
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={fontsHref} />
      </head>
      <body className="min-h-full flex flex-col bg-sky-ground text-ink">{children}</body>
    </html>
  );
}
