import "./globals.css";

// 和文フォントは next/font だと全サブセットをビルド時に取得して重いので、
// Google Fonts のスタイルシートから必要な文字範囲だけブラウザに読ませる
const fontsHref =
  "https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap";

export const metadata = {
  title: "旅行清算アプリ",
  description: "旅行の立て替えを記録して、誰が誰にいくら払うかを自動計算する割り勘アプリ",
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
