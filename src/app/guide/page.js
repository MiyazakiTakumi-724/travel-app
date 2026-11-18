import Link from "next/link";
import { auth } from "@/auth";
import SiteHeader from "@/components/SiteHeader";
import { formatYen } from "@/lib/format";

export const metadata = {
  title: "使い方 | 旅行清算アプリ",
};

// 精算のしかたの説明に使う計算例（README と同じ、4人で76,000円）
const SHARE = 19000;
const example = [
  ["あきら", 40000],
  ["ゆうき", 30000],
  ["はなこ", 6000],
  ["じろう", 0],
];

const steps = [
  {
    id: "login",
    title: "Googleでログイン",
    body: (
      <p>
        トップページの「Googleでログイン」を押します。はじめてのときは、メンバーに表示するニックネームを決めます。
      </p>
    ),
  },
  {
    id: "create",
    title: "プロジェクトを作る",
    body: (
      <p>
        マイプロジェクトの「新しいプロジェクトを作成」から、タイトル・目的地を入れます。日程がまだ決まっていなければ「これから決める」を選んで旅行の日数（例：2泊3日）だけを入れ、決まっていれば日付を入れます。あとから編集・削除できるのは、作成した人だけです。
      </p>
    ),
  },
  {
    id: "invite",
    title: "友達を招待",
    body: (
      <p>
        プロジェクトの画面で「招待リンクをコピー」を押し、LINEなどで送ります。リンクを開いた友達は、ログインするとメンバーになります。
      </p>
    ),
  },
  {
    id: "schedule",
    title: "日程を決める",
    body: (
      <>
        <p>日程が決まっていないプロジェクトは、「日程」の画面から始まります。</p>
        <ol className="mt-2 list-decimal pl-5">
          <li>作成者が、候補を探す期間（例：11/1〜11/30）を決めます。</li>
          <li>メンバーそれぞれが、カレンダーで行けない日をタップして × を付けます。みんなの予定は表で見られます。</li>
          <li>行けない人が少ない日程が「おすすめ」に出るので、作成者がそこから候補を選びます。</li>
          <li>全員が候補に ○（行ける）・△（たぶん）・×（行けない）で答えます。</li>
          <li>作成者が投票を見て「この日程に決定」を押すと、日程が決まります。</li>
        </ol>
      </>
    ),
  },
  {
    id: "record",
    title: "支払いを記録",
    body: (
      <>
        <p>「支払いを記録」から、金額・内容・支払った人を入れます。</p>
        <ul className="mt-2 list-disc pl-5">
          <li>支払った人を複数選ぶと、金額を均等に割って記録します（例：¥9,000 を2人で → ¥4,500 ずつ）。</li>
          <li>記録はメンバー全員が見られ、誰でも編集・削除できます。</li>
        </ul>
      </>
    ),
  },
  {
    id: "settle",
    title: "精算する",
    body: (
      <>
        <p>
          画面に「あなたが受け取る金額／支払う金額」と、その相手が表示されます。送金が済んだら、その支払いにチェックを入れると精算済みになり、計算から外れます。
        </p>
        <div className="mt-4 rounded-lg border border-line-soft bg-paper px-4.5 py-4">
          <p className="font-bold text-ink">計算のしかた（4人で ¥76,000 使った例）</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[22rem] border-collapse text-sm">
              <thead>
                <tr className="text-ink-muted">
                  <th className="py-2 pr-2 text-left font-bold">人</th>
                  <th className="px-2 py-2 text-right font-bold">払った額</th>
                  <th className="px-2 py-2 text-right font-bold">負担額</th>
                  <th className="py-2 pl-2 text-right font-bold">収支</th>
                </tr>
              </thead>
              <tbody className="amount font-semibold">
                {example.map(([name, paid]) => {
                  const balance = paid - SHARE;
                  return (
                    <tr key={name} className="border-t border-line-soft">
                      <td className="py-2 pr-2 font-sans font-medium">{name}</td>
                      <td className="px-2 py-2 text-right">{formatYen(paid)}</td>
                      <td className="px-2 py-2 text-right">{formatYen(SHARE)}</td>
                      <td className={`py-2 pl-2 text-right ${balance > 0 ? "text-primary" : "text-pay"}`}>
                        {balance > 0 ? "+" : "−"}
                        {formatYen(Math.abs(balance))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            合計を人数で割った負担額と、実際に払った額の差が「収支」です。払う額が大きい人から、受け取る額が大きい人へ順に送金するので、この例では送金は3回で済みます。
          </p>
        </div>
      </>
    ),
  },
];

export default async function GuidePage() {
  const session = await auth();
  const backHref = session ? "/projects" : "/";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoHref={backHref}>
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center text-sm font-medium text-ink-muted transition-colors hover:text-primary">
          ← 戻る
        </Link>
      </SiteHeader>

      <main className="mx-auto grid w-full max-w-280 flex-1 gap-12 px-5 pt-6 pb-20 sm:px-6 sm:pt-10 md:grid-cols-[200px_1fr]">
        <nav aria-label="目次" className="hidden md:block">
          <ol className="sticky top-6 flex flex-col text-sm">
            {steps.map((step, index) => (
              <li key={step.id}>
                <a
                  href={`#${step.id}`}
                  className="block border-l-3 border-line-soft px-3 py-2 text-ink-sub transition-colors hover:border-primary hover:text-primary">
                  {index + 1}. {step.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 max-w-170">
          <h1 className="heading text-[clamp(30px,4vw,38px)] leading-tight">使い方</h1>
          <p className="mt-2 leading-[1.8] text-ink-sub">旅行の準備から精算まで、6つのステップで使えます。</p>

          <ol className="mt-4">
            {steps.map((step, index) => (
              <li key={step.id} id={step.id} className="mt-9 grid scroll-mt-6 grid-cols-[44px_1fr] gap-4.5">
                <span
                  aria-hidden="true"
                  className={`grid size-11 place-items-center rounded-full amount text-xl text-white ${
                    index === steps.length - 1 ? "bg-pay" : "bg-primary"
                  }`}>
                  {index + 1}
                </span>
                <div className="min-w-0 text-[15px] leading-[1.85] text-ink-sub">
                  <h2 className="mt-1.5 mb-1.5 heading text-xl text-ink">{step.title}</h2>
                  {step.body}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
