# 旅行清算アプリ

旅行中の立て替えを記録して、「誰が誰にいくら払えばよいか」を自動で計算する割り勘Webアプリです。
Googleでログインして旅行を作り、招待URLで友人を招くと、メンバー全員で支払いを共有できます。

**公開URL**：https://travel-app-xi-seven.vercel.app/

## 主な機能

- **Googleログイン**：アカウント登録は不要です。初回ログイン時に、メンバーに表示するニックネームを設定します。
- **旅行（プロジェクト）の管理**：タイトル・目的地・期間を登録できます。作成者は編集・削除もできます。
- **招待URL**：リンクを送るだけで、友人が旅行に参加できます。
- **支払いの記録**：誰が何にいくら払ったかを記録します。複数人で払った場合は均等に割って記録します。
- **精算の自動計算**：未精算の支払いから、送金の組み合わせを計算します。自分が受け取る・支払う金額を大きく表示します。
- **精算済みチェック**：精算が終わった支払いを計算から外せます。
- **スマホ対応**：スマホでも使いやすい画面です。

## 使用技術

| 分類 | 技術 |
|---|---|
| 言語 | JavaScript |
| フレームワーク | Next.js 16（App Router・Server Actions）、React 19 |
| スタイル | Tailwind CSS v4 |
| 認証 | Auth.js（next-auth v5）＋ Google OAuth |
| ORM / DB | Prisma 7 / PostgreSQL |
| ホスティング | Vercel（関数はシンガポールリージョン）、Neon（PostgreSQL） |

## 工夫した点

### 精算の計算

1. 未精算の支払いの合計を人数で割り、1人あたりの負担額を出します。
2. 各自の収支（払った額 − 負担額）を求めます。
3. 受け取る人と払う人を、それぞれ金額の大きい順に並べて先頭どうしを組み合わせます（貪欲法）。こうすることで送金回数を減らしています。

例：4人で ¥76,000 を使った場合、1人あたりの負担は ¥19,000 で、送金は3回で済みます。

### 操作の反応速度

- **リージョンをDBに合わせる**：Vercel の関数は、何も設定しないとアメリカ東海岸で動きます。`vercel.json` で、Neon のDBと同じシンガポール（`sin1`）で動くようにしました。
- **楽観的更新**：精算済みチェックや支払いの記録は、React の `useOptimistic` で、サーバーの応答を待たずに画面へ先に反映します。失敗した場合は元の表示に戻ります。

## ローカルでの起動方法

### 必要なもの

- Node.js 24 以上
- Docker（ローカルの PostgreSQL 用）
- Google OAuth のクライアントID・シークレット（[Google Cloud Console](https://console.cloud.google.com/) で作成）

### 手順

1. 依存パッケージをインストールします。

   ```bash
   npm install
   ```

2. PostgreSQL を起動します。

   ```bash
   docker compose up -d
   ```

3. 環境変数を設定します。

   `.env`
   ```
   DATABASE_URL=postgresql://travelproj:travelproj@localhost:5432/travelproj
   ```

   `.env.local`
   ```
   AUTH_SECRET=        # npx auth secret で生成
   AUTH_GOOGLE_ID=     # Google OAuth のクライアントID
   AUTH_GOOGLE_SECRET= # Google OAuth のクライアントシークレット
   ```

   Google Cloud Console の承認済みリダイレクトURIには、`http://localhost:3000/api/auth/callback/google` を登録してください。

4. DBのテーブルを作成します。

   ```bash
   npx prisma migrate deploy
   ```

5. 開発サーバーを起動し、http://localhost:3000 を開きます。

   ```bash
   npm run dev
   ```

## デプロイ

Vercel と Neon を使っています。

- Vercel の Build Command：`npx prisma migrate deploy && npm run build`
- Vercel の環境変数：`DATABASE_URL`（Neon の接続文字列）、`AUTH_SECRET`、`AUTH_GOOGLE_ID`、`AUTH_GOOGLE_SECRET`
- Google Cloud Console の承認済みリダイレクトURIに、`https://<公開URL>/api/auth/callback/google` を追加します。

## ディレクトリ構成

```
src/
├── app/
│   ├── page.js               トップページ（ログイン）
│   ├── projects/             旅行の一覧・作成
│   │   └── [id]/             旅行の詳細（支払い・精算）
│   ├── invite/[projectId]/   招待URLからの参加
│   └── api/auth/             Auth.js の認証ルート
├── components/               共通の画面部品（モーダル、ヘッダーなど）
└── lib/                      Prisma クライアント、金額・日付の整形など
prisma/
├── schema.prisma             DB設計
└── migrations/               マイグレーション
```
