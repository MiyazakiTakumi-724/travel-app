import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import SiteHeader from "@/components/SiteHeader";
import { GoogleIcon } from "@/components/icons";
import { secondaryButtonClass } from "@/components/ui";

const steps = [
  {
    title: "Googleでログイン",
    description: "アカウント登録は不要。Googleアカウントですぐに始められます。",
  },
  {
    title: "旅行を作って友達を招待",
    description: "招待リンクを送るだけでメンバーが参加できます。",
  },
  {
    title: "支払いを記録",
    description: "誰が何にいくら払ったかを記録。複数人での割り勘もOK。",
  },
  {
    title: "精算方法が自動で分かる",
    description: "誰が誰にいくら払うかを自動で計算して表示します。",
  },
];

// ヒーロー右側の精算券は装飾用のダミー（4人で76,000円を割った場合の計算例）
const sampleTransfers = [
  ["さくら → はなこ", "¥8,000"],
  ["さくら → たろう", "¥5,000"],
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
        <section className="mx-auto grid w-full max-w-[1120px] items-center gap-12 px-5 pt-10 pb-20 sm:px-6 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pt-16 md:pb-24">
          <div className="flex min-w-0 flex-col gap-6">
            <h1 className="font-display text-[clamp(40px,6.4vw,76px)] leading-[1.12]">
              旅行清算アプリ
            </h1>
            <p className="max-w-[26em] text-lg leading-[1.8] text-ink-sub">
              Googleアカウントでログインして、旅費の記録・精算を始めましょう。
            </p>
            <form action={signInWithGoogle} className="mt-3">
              <button
                type="submit"
                className="inline-flex min-h-[52px] items-center gap-3 rounded-md border border-[#747775] bg-white pr-6 pl-4 font-medium text-[#1F1F1F] transition-colors hover:bg-[#F7F8F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <GoogleIcon size={20} />
                Googleでログイン
              </button>
            </form>
          </div>

          <div
            role="img"
            aria-label="精算の例：じろうさんがはなこさんに13,000円支払う"
            className="mx-auto w-full max-w-[440px] -rotate-2 drop-shadow-[0_24px_28px_rgb(21_128_196/0.18)]"
          >
            <div className="ticket-top px-6 pt-5 pb-6 sm:px-[30px]">
              <div className="flex items-baseline justify-between gap-3 border-b-2 border-dashed border-line-dashed pb-4">
                <span className="font-bold">沖縄旅行</span>
                <span className="text-sm text-ink-sub">4人で精算</span>
              </div>
              <div className="mt-5 flex items-center gap-3.5 font-display text-[26px] leading-tight sm:text-[34px]">
                <span>じろう</span>
                <span aria-hidden="true" className="relative h-0.5 min-w-7 flex-1 bg-pay after:absolute after:-top-1.5 after:-right-0.5 after:border-y-[7px] after:border-l-[10px] after:border-y-transparent after:border-l-pay" />
                <span>はなこ</span>
              </div>
              <div className="mt-2 font-display text-[38px] text-pay sm:text-[48px]">¥13,000</div>
            </div>
            <div className="ticket-bottom grid gap-1 px-6 pt-4 pb-5 text-[15px] sm:px-[30px]">
              {sampleTransfers.map(([label, amount]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span>{amount}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="how-heading" className="bg-paper">
          <div className="mx-auto w-full max-w-[1120px] px-5 pt-[72px] pb-24 sm:px-6">
            <h2 id="how-heading" className="font-display text-3xl">
              使い方
            </h2>
            {/* 手順を路線図の駅に見立てて並べる */}
            <div className="relative mt-11">
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
                    <h3 className="text-lg font-black md:mt-[18px]">{step.title}</h3>
                    <p className="mt-1.5 max-w-[18em] text-[15px] leading-[1.8] text-ink-sub">{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-[1120px] px-5 py-6 text-[13px] text-ink-muted sm:px-6">
        © 旅行清算アプリ
      </footer>
    </div>
  );
}
