import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { safeCallbackPath } from "@/lib/loginRedirect";
import { listBrowserGuestProjects } from "@/lib/guestSession";
import { formatTripPeriod } from "@/lib/format";
import SiteHeader, { GuideLink } from "@/components/SiteHeader";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import GuestCodeForm from "@/components/GuestCodeForm";
import { secondaryButtonClass } from "@/components/ui";
import SiteFooter from "@/components/SiteFooter";

// トップページの「使い方」。ひとことずつで流れが分かるようにする（くわしくは使い方ページ）
const steps = [
  {
    title: "Googleかゲストで始める",
    description: "アカウントがなくても、ニックネームだけで使えます。",
  },
  {
    title: "旅行を作って招待",
    description: "招待リンクを送るだけで、友達が参加できます。",
  },
  {
    title: "日程を決める",
    description: "みんなの行ける日を集めて、幹事が日程を決めます。",
  },
  {
    title: "支払いを記録",
    description: "誰が何にいくら払ったかを、その場で記録します。",
  },
  {
    title: "精算する",
    description: "誰が誰にいくら払えばいいかを、自動で計算します。",
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


// 「ゲストでプロジェクトを作成」のボタン（Google のボタンと同じ高さ・丸さにそろえる）
function GuestStartLink() {
  return (
    <Link href="/guest/new" className={`${secondaryButtonClass} min-h-13 rounded-full! px-7 text-[15px] whitespace-nowrap`}>
      ゲストでプロジェクトを作成
    </Link>
  );
}

export default async function Home({ searchParams }) {
  const { callbackUrl, guest, deleted } = await searchParams;
  // ログインしたら戻るページ（外のサイトは受け付けない）
  const redirectTarget = safeCallbackPath(callbackUrl);

  const session = await auth();

  if (session) {
    redirect(redirectTarget);
  }

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: redirectTarget });
  }

  // このブラウザでゲストとして参加しているプロジェクト（コードを入れなくても、ここから開ける）
  const guestProjects = await listBrowserGuestProjects();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader>
        <GuideLink />
      </SiteHeader>

      <main className="flex-1">
        {/* スマホでは「タイトル → 説明 → ログインボタン → 精算券」の順に縦に並べ、最初の画面でボタンが見えるようにする */}
        <section className="mx-auto grid w-full max-w-280 items-center gap-12 px-5 pt-8 pb-20 sm:px-6 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pt-16 md:pb-24">
          <div className="flex min-w-0 flex-col">
            {deleted && (
              <p role="status" className="mb-6 rounded-xl bg-paper px-4.5 py-3.5 text-sm leading-relaxed font-bold text-primary">
                アカウントを削除しました。ご利用ありがとうございました。
              </p>
            )}
            <h1 className="heading text-[clamp(38px,6vw,64px)] leading-[1.2]">
              旅行<span className="text-primary">清算</span>アプリ
            </h1>
            <p className="phrase mt-4 max-w-[26em] text-[17px] leading-[1.9] text-ink-sub">
              支払いを記録するだけで、誰が誰にいくら払えばいいかを自動で計算します。Googleアカウントでもゲストでも、すぐに始められます。
            </p>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {points.map(([strong, rest]) => (
                <li key={strong} className="rounded-full bg-paper px-3.5 py-1.5 text-[13px] font-bold text-ink-sub">
                  <b className="text-primary">{strong}</b>
                  {rest}
                </li>
              ))}
            </ul>

            {/* 始め方をまとめて置く：Googleでログイン／ゲストで作成／（ゲストだった人は）コードで戻る */}
            <div className="mt-8 flex w-full max-w-md flex-col gap-3">
              {guestProjects.length > 0 && (
                <div className="mb-2 rounded-xl bg-paper px-4.5 pt-3.5 pb-2">
                  <p className="text-sm font-bold text-ink-sub">このブラウザで参加中のプロジェクト</p>
                  <ul className="mt-1 divide-y divide-sky-ground">
                    {guestProjects.map((project) => (
                      <li key={project.id}>
                        <Link
                          href={`/projects/${project.id}`}
                          className="flex items-center gap-3 py-3 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-bold">{project.title}</span>
                            <span className="block truncate text-xs text-ink-muted">
                              ゲスト（{project.nickname}）・{formatTripPeriod(project)}
                            </span>
                          </span>
                          <span aria-hidden="true" className="shrink-0 text-lg text-ink-faint">›</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <GoogleSignInButton action={signInWithGoogle} />
              <GuestStartLink />
              <p className="phrase text-xs leading-relaxed text-ink-muted">
                始めると、
                <Link href="/terms" className="underline hover:text-primary">利用規約</Link>
                と
                <Link href="/privacy" className="underline hover:text-primary">プライバシーポリシー</Link>
                に同意したことになります。
              </p>
              <div className="mt-2 rounded-xl bg-paper px-4.5 pt-3.5 pb-4">
                <GuestCodeForm
                  initialError={guest === "invalid" ? "リンクのコードが見つかりませんでした。コードを入力してください" : ""}
                />
              </div>
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
              <ol className="relative grid gap-7 md:grid-cols-5 md:gap-0">
                {steps.map((step, index) => (
                  <li key={step.title} className="relative pl-12 md:pl-0 md:pr-6">
                    <span
                      aria-hidden="true"
                      className={`absolute top-0 left-0 block size-7 rounded-full border-[6px] bg-paper md:relative ${
                        index === steps.length - 1 ? "border-pay" : "border-primary"
                      }`}
                    />
                    <h3 className="heading text-lg md:mt-4.5">{step.title}</h3>
                    <p className="phrase mt-1.5 max-w-[18em] text-[15px] leading-[1.8] text-ink-sub md:max-w-none md:text-sm">{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* 使い方を読み終えた位置にもう一度ボタンを置き、上まで戻らずに始められるようにする */}
            <div className="mt-14 flex flex-col items-start gap-4 border-t-2 border-dashed border-line-dashed pt-10 sm:flex-row sm:items-center sm:justify-between">
              <p className="heading text-xl">さっそく始めましょう</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <GoogleSignInButton action={signInWithGoogle} />
                <GuestStartLink />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
