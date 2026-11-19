import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import SiteHeader, { GuideLink } from "@/components/SiteHeader";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import GuestCodeForm from "@/components/GuestCodeForm";
import { secondaryButtonClass } from "@/components/ui";
import SiteFooter from "@/components/SiteFooter";

const steps = [
  {
    title: "Googleでログイン",
    description: "はじめにメンバーに表示するニックネームを決めます。",
  },
  {
    title: "プロジェクトを作って招待",
    description: "招待リンクを送るだけでメンバーが参加できます。",
  },
  {
    title: "支払いを記録",
    description: "誰が何にいくら払ったかを記録します。",
  },
  {
    title: "精算方法が分かる",
    description: "誰が誰にいくら払うかを自動で計算して表示します。",
  },
];

const points = [
  ["招待リンク", "で友達が参加"],
  ["日程調整", "もできる"],
  ["精算額", "を自動で計算"],
];

// ヒーロー右側の精算券は装飾用のダミー。使い方ページ・README と同じ「沖縄旅行：4人で ¥76,000」の例の送金3回
const sampleTransfers = [
  ["はなこ → あきら", "¥2,000"],
  ["はなこ → ゆうき", "¥11,000"],
];


export default async function Home({ searchParams }) {
  const { callbackUrl, guest } = await searchParams;
  const redirectTarget =
    typeof callbackUrl === "string" && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/projects";

  const session = await auth();

  if (session) {
    redirect(redirectTarget);
  }

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: redirectTarget });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        <GuideLink />
      </SiteHeader>

      <main className="flex-1">
        {/* スマホでは「タイトル → 説明 → ログインボタン → 精算券」の順に縦に並べ、最初の画面でボタンが見えるようにする */}
        <section className="mx-auto grid w-full max-w-280 items-center gap-12 px-5 pt-8 pb-20 sm:px-6 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pt-16 md:pb-24">
          <div className="flex min-w-0 flex-col">
            <h1 className="heading text-[clamp(38px,6vw,64px)] leading-[1.2]">
              旅行<span className="text-primary">清算</span>アプリ
            </h1>
            <p className="mt-4 max-w-[26em] text-[17px] leading-[1.9] text-ink-sub">
              支払いを記録するだけで、誰が誰にいくら払えばいいかを自動で計算します。Googleアカウントでも、ゲストとしてでも、すぐに始められます。
            </p>
            <div className="mt-7">
              <GoogleSignInButton action={signInWithGoogle} />
              <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
                ログインすると、
                <Link href="/terms" className="underline hover:text-primary">利用規約</Link>
                と
                <Link href="/privacy" className="underline hover:text-primary">プライバシーポリシー</Link>
                に同意したことになります。
              </p>
            </div>
            <ul className="mt-7 flex flex-wrap gap-2.5">
              {points.map(([strong, rest]) => (
                <li key={strong} className="rounded-full bg-paper px-3.5 py-1.5 text-[13px] font-bold text-ink-sub">
                  <b className="text-primary">{strong}</b>
                  {rest}
                </li>
              ))}
            </ul>

            {/* アカウントなしで使う人向け */}
            <div className="mt-8 flex flex-col gap-3 rounded-xl bg-paper px-5 py-4.5">
              <p className="font-bold">ゲストで使う</p>
              <p className="-mt-2 text-xs leading-relaxed text-ink-muted">Googleアカウントがなくても使えます。</p>
              <Link href="/guest/new" className={`${secondaryButtonClass} min-h-12 text-[15px]`}>
                ゲストでプロジェクトを作成
              </Link>
              <GuestCodeForm
                initialError={guest === "invalid" ? "リンクのコードが見つかりませんでした。コードを入力してください" : ""}
              />
            </div>
          </div>

          <div
            role="img"
            aria-label="精算の例：沖縄旅行を4人で精算。じろうさんがあきらさんに19,000円、はなこさんがあきらさんに2,000円とゆうきさんに11,000円を支払う"
            className="mx-auto w-full max-w-110 -rotate-2 drop-shadow-[0_24px_28px_rgb(21_128_196/0.18)]"
          >
            <div className="ticket-top px-6 pt-5 pb-6 sm:px-7.5">
              <div className="flex items-baseline justify-between gap-3 border-b-2 border-dashed border-line-dashed pb-4">
                <span className="font-bold">沖縄旅行</span>
                <span className="text-sm text-ink-sub">4人で精算</span>
              </div>
              <div className="mt-5 flex items-center gap-3.5 heading text-[26px] leading-tight sm:text-[32px]">
                <span>じろう</span>
                <span aria-hidden="true" className="relative h-0.5 min-w-7 flex-1 bg-pay after:absolute after:-top-1.5 after:-right-0.5 after:border-y-[7px] after:border-l-[10px] after:border-y-transparent after:border-l-pay" />
                <span>あきら</span>
              </div>
              <div className="mt-1 amount text-[44px] leading-tight text-pay sm:text-[54px]">¥19,000</div>
            </div>
            <div className="ticket-bottom grid gap-1 px-6 pt-4 pb-5 text-[15px] sm:px-7.5">
              {sampleTransfers.map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span className="amount">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="how-heading" className="bg-paper">
          <div className="mx-auto w-full max-w-280 px-5 pt-16 pb-20 sm:px-6">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 id="how-heading" className="heading text-3xl">
                使い方
              </h2>
              <Link href="/guide" className="font-bold text-primary transition-colors hover:text-primary-hover">
                くわしい使い方 →
              </Link>
            </div>
            {/* 手順を路線図の駅に見立てて並べる */}
            <div className="relative mt-10">
              <div
                aria-hidden="true"
                className="absolute top-3 bottom-3 left-[11px] w-1.5 rounded-full bg-primary md:top-[11px] md:right-3 md:bottom-auto md:left-3 md:h-1.5 md:w-auto"
              />
              <ol className="relative grid gap-7 md:grid-cols-4 md:gap-0">
                {steps.map((step, index) => (
                  <li key={step.title} className="relative pl-12 md:pl-0 md:pr-6">
                    <span
                      aria-hidden="true"
                      className={`absolute top-0 left-0 block size-7 rounded-full border-[6px] bg-paper md:relative ${
                        index === steps.length - 1 ? "border-pay" : "border-primary"
                      }`}
                    />
                    <h3 className="heading text-lg md:mt-4.5">{step.title}</h3>
                    <p className="mt-1.5 max-w-[18em] text-[15px] leading-[1.8] text-ink-sub">{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* 使い方を読み終えた位置にもう一度ボタンを置き、上まで戻らずに始められるようにする */}
            <div className="mt-14 flex flex-col items-start gap-4 border-t-2 border-dashed border-line-dashed pt-10 sm:flex-row sm:items-center sm:justify-between">
              <p className="heading text-xl">さっそく始めましょう</p>
              <div className="w-full sm:w-auto">
                <GoogleSignInButton action={signInWithGoogle} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
