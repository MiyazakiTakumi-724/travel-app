// ホーム画面に追加したとき、ブラウザのバーなしでアプリのように開けるようにする
export default function manifest() {
  return {
    name: "旅行清算アプリ",
    short_name: "旅行清算",
    description: "旅行の立て替えを記録して、誰が誰にいくら払うかを自動計算する割り勘アプリ",
    // トップページから始める（Googleでログインしていればマイプロジェクトへ移り、ゲストは参加中のプロジェクトを選べる）
    start_url: "/",
    display: "standalone",
    background_color: "#E2F4FC",
    theme_color: "#E2F4FC",
    lang: "ja",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
