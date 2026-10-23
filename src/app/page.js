import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import SiteHeader from "@/components/SiteHeader";
import Stamp from "@/components/Stamp";
import { GoogleIcon } from "@/components/icons";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";

const steps = [
  {
    title: "Googleでログイン",
    description: "アカウント登録は不要。Googleアカウントですぐに始められます。",
  },
  {
    title: "旅行を作って友達を招待",
    description: "プロジェクトを作成し、招待リンクを送るだけでメンバーが参加できます。",
  },
  {
    title: "支払いを記録",
    description: "誰が何にいくら払ったかを記録。複数人での割り勘もOK。",
  },
  {
    title: "精算方法が自動で分かる",
    description: "最終的に「誰が誰にいくら払うか」を自動で計算して表示します。",
  },
];

// ヒーロー右側のレシートは装飾用のダミー（4人で76,000円を割った場合の計算例）
const sampleExpenses = [
  ["宿泊", "¥40,000"],
  ["レンタカー", "¥24,000"],
  ["夕食", "¥12,000"],
];
const sampleTransfers = [
  ["D → B", "¥19,000"],
  ["C → A", "¥5,000"],
  ["C → B", "¥2,000"],
];

export default async function Home({ searchParams }) {
  const { callbackUrl } = await searchParams;
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
        <form action={signInWithGoogle}>
          <button type="submit" className={`${secondaryButtonClass} min-h-11 px-[18px] text-sm`}>
            ログイン
          </button>
        </form>
      </SiteHeader>

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-16 px-6 pt-14 pb-20 sm:pt-[72px] sm:pb-24">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-8">
            <h1 className="text-[clamp(36px,6vw,64px)] leading-[1.15] font-extrabold tracking-[-0.02em]">
              旅行清算アプリ
            </h1>
            <p className="max-w-[28em] text-lg leading-[1.85] text-ink-sub">
              Googleアカウントでログインして、旅費の記録・精算を始めましょう。
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              <form action={signInWithGoogle}>
                <button
                  type="submit"
                  className={`${primaryButtonClass} min-h-[58px] gap-3 pr-8 pl-3.5 text-[17px] shadow-offset-lg`}
                >
                  <span className="flex size-7 items-center justify-center bg-paper">
                    <GoogleIcon />
                  </span>
                  Googleでログイン →
                </button>
              </form>
              <span className="font-mono text-[13px] text-ink-sub">登録不要</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-[1_1_360px] justify-center">
            <div
              role="img"
              aria-label="レシート風の精算表示例"
              className="flex w-full max-w-[380px] rotate-[1.5deg] flex-col gap-3.5 bg-paper px-[30px] pt-8 pb-10 font-mono text-sm shadow-[0_28px_48px_-28px_rgba(11,116,181,0.45)]"
            >
              <div className="text-center font-bold tracking-[0.2em]">*** 精算明細 · 例 ***</div>
              <div className="text-center text-ink-muted">沖縄旅行 / 4名</div>
              <div className="border-t border-dashed border-ink" />
              {sampleExpenses.map(([label, amount]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span>{amount}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-ink" />
              <div className="font-bold text-primary">送金</div>
              {sampleTransfers.map(([label, amount]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span>{amount}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-ink" />
              <Stamp className="self-end" />
            </div>
          </div>
        </section>

        <section aria-labelledby="how-heading" className="border-t-[1.5px] border-ink bg-paper">
          <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-10 px-6 pt-[72px] pb-24">
            <h2 id="how-heading" className="text-[32px] font-extrabold">
              使い方
            </h2>
            <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-x-6 border-t-[1.5px] border-ink">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="flex flex-col gap-3 border-b border-line-soft py-7"
                >
                  <span className="font-mono text-sm font-bold text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[19px] font-bold">{step.title}</h3>
                  <p className="text-[15px] leading-[1.8] text-ink-sub">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-[1180px] px-6 py-6 font-mono text-xs text-ink-muted">
        © 旅行清算アプリ
      </footer>
    </div>
  );
}
