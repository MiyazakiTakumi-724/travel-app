import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import SiteHeader from "@/components/SiteHeader";
import { GoogleIcon } from "@/components/icons";
import { cardClass } from "@/components/ui";

const steps = ["旅行を作る", "招待リンクを送る", "支払いを記録", "精算額が出る"];

// ログイン後に見られる精算画面の見本（ダミーの数値）
const sampleTransfers = [
  ["けんた → あなた", "¥23,250"],
  ["さくら → あなた", "¥4,500"],
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

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-center gap-12">
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">旅行清算アプリ</h1>
            <form
              className="w-full max-w-sm"
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: redirectTarget });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 px-6 py-3.5 rounded-full text-base font-semibold shadow-sm transition hover:shadow-md active:bg-gray-50"
              >
                <GoogleIcon />
                Googleでログイン
              </button>
            </form>
          </div>

          <div
            role="img"
            aria-label="精算画面の見本"
            className="min-w-0 flex-[1_1_320px] rounded-2xl bg-gray-100 p-4 sm:p-6"
          >
            <p className="mb-3 text-lg font-bold text-gray-900">
              沖縄旅行 <span className="text-sm font-normal text-gray-500">4名</span>
            </p>
            <div className={`${cardClass} p-5 sm:p-6`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-gray-500">あなたの収支</span>
                <span className="text-3xl font-bold tabular-nums text-blue-600">+¥27,750</span>
              </div>
              <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-100 text-sm">
                {sampleTransfers.map(([label, amount]) => (
                  <li key={label} className="flex justify-between py-2.5">
                    <span>{label}</span>
                    <b className="tabular-nums text-blue-600">{amount}</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <ol className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step} className={`${cardClass} flex items-center gap-3 p-4`}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="text-sm font-bold text-gray-900">{step}</span>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
