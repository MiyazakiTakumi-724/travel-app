import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import SiteHeader from "@/components/SiteHeader";
import Stamp from "@/components/Stamp";
import { GoogleIcon } from "@/components/icons";
import { primaryButtonClass } from "@/components/ui";

const steps = ["Googleでログイン", "旅行を作って友達を招待", "支払いを記録", "誰が誰に払うかが出る"];

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
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-16 px-6 pt-14 pb-20 sm:pt-[72px] sm:pb-24">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-10">
            <h1 className="text-[clamp(36px,10vw,84px)] leading-[1.08] font-extrabold tracking-[-0.02em] break-keep whitespace-nowrap">
              割り勘は、
              <br />
              アプリに
              <br />
              <span className="text-primary">任せよう。</span>
            </h1>
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className={`${primaryButtonClass} min-h-[58px] gap-3 pr-6 pl-3.5 text-[17px] whitespace-nowrap shadow-offset-lg sm:pr-8`}
              >
                <span className="flex size-7 items-center justify-center bg-paper">
                  <GoogleIcon />
                </span>
                Googleでログイン
              </button>
            </form>
          </div>

          <div className="flex min-w-0 flex-[1_1_360px] justify-center">
            <div
              role="img"
              aria-label="レシート風の精算表示例"
              className="flex w-full max-w-[380px] rotate-[1.5deg] flex-col gap-3.5 bg-paper px-[30px] pt-8 pb-10 font-mono text-sm shadow-[0_28px_48px_-28px_rgba(11,116,181,0.45)]"
            >
              <div className="text-center font-bold tracking-[0.2em]">沖縄旅行 / 4名</div>
              <div className="border-t border-dashed border-ink" />
              {sampleExpenses.map(([label, amount]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span>{amount}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-ink" />
              {sampleTransfers.map(([label, amount]) => (
                <div key={label} className="flex justify-between font-bold text-primary">
                  <span>{label}</span>
                  <span>{amount}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-ink" />
              <Stamp className="self-end" />
            </div>
          </div>
        </section>

        <section aria-label="使い方" className="border-t-[1.5px] border-ink bg-paper">
          <ol className="mx-auto grid w-full max-w-[1180px] grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-x-6 px-6 py-14">
            {steps.map((step, index) => (
              <li
                key={step}
                className="flex items-baseline gap-4 border-b border-line-soft py-5"
              >
                <span className="font-mono text-sm font-bold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[17px] font-bold">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
