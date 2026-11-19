/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // 「Next.js で作られている」ことを応答に書かない
  poweredByHeader: false,
  // すべてのページに付ける、セキュリティのためのヘッダー
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // ほかのサイトの枠（iframe）の中に表示させない（透明な枠を重ねてボタンを押させる攻撃を防ぐ）
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          // ファイルの種類をブラウザに推測させない
          { key: "X-Content-Type-Options", value: "nosniff" },
          // ほかのサイトへ移るときは、どのページから来たかをドメインまでしか伝えない
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 使わない機能（カメラ・マイク・位置情報）は使えないようにしておく
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
