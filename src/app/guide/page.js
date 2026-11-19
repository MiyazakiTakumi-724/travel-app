import Link from "next/link";
import { auth } from "@/auth";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { formatYen } from "@/lib/format";

export const metadata = {
  title: "使い方 | 旅行清算アプリ",
};

// 精算のしかたの説明に使う計算例（トップページ・README と同じ、沖縄旅行を4人で76,000円）
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
        マイプロジェクトの「新しいプロジェクトを作成」から、タイトル・目的地を入れます。日程がまだ決まっていなければ「これから決める」を選んで、旅行の日数（例：2泊3日）と、行ける日を聞く期間（例：11/1〜11/30）を入れます。決まっていれば日付を入れます。あとから編集・削除できるのは、作成した人だけです。
      </p>
    ),
  },
  {
    id: "invite",
    title: "友達を招待",
    body: (
      <>
        <p>
          プロジェクトの「メンバー」の画面で「招待リンクを送る」を押すと、スマホでは共有メニューが開くので、LINEなどで送ります（PCでは「招待リンクをコピー」でリンクをコピーします）。リンクを開いた友達は、ログインするとメンバーになります。
        </p>
        <p className="mt-2">
          作成者は、間違えて参加した人などを「外す」でメンバーから外せます。支払いの記録がある人は、精算の金額が変わらないよう外せません。
        </p>
      </>
    ),
  },
  {
    id: "schedule",
    title: "日程を決める",
    body: (
      <>
        <p>日程が決まっていないプロジェクトは、「日程」の画面から始まります。</p>
        <ol className="mt-2 list-decimal pl-5">
          <li>
            メンバーそれぞれが、カレンダーで行ける日をタップして選び、「行ける日を提出する」を押します。「全部」「土日祝だけ」「全部外す」でまとめて選ぶこともできます。全員が提出するまで、次に進めません。
          </li>
          <li>全員の提出が終わると、作成者はみんなの行ける日の表を見て、出発日を選んで「仮決定」します。</li>
          <li>メンバーは、仮決定の日程に ○（行ける）・×（行けない）で答えます。</li>
          <li>全員が ○ と答えると、自動で日程が確定します。× の人がいたら、作成者が日程を選び直します。</li>
        </ol>
        <p className="mt-2">
          行ける日の提出や ○× の回答など、自分がやることがあるときは、「日程」のタブに赤い点が付きます。
        </p>
        <p className="mt-2">
          日程が決まると、「日程」の画面に日ごとの「旅行の予定」が出ます。「予定を追加」から集合時間や行きたい場所を、メンバーみんなで書き込めます。書いた予定は、タップすると直したり消したりできます。
        </p>
      </>
    ),
  },
  {
    id: "record",
    title: "支払いを記録",
    body: (
      <>
        <p>「支払い記録」のボタン（スマホは画面の下、PCは右上の「支払いを記録」）から、金額・内容・支払った人（1人）を入れます。支払った人は、最初は自分が選ばれています。</p>
        <ul className="mt-2 list-disc pl-5">
          <li>記録はメンバー全員が見られ、誰でも直したり消したりできます。行をタップすると、編集の画面が開きます。</li>
          <li>消した直後は、画面の下の「元に戻す」で取り消せます。</li>
          <li>「支払い」の画面の上で名前を選ぶと、その人が払った分だけを見られます（何人でも選べます）。</li>
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
          「精算」の画面のレシートに、支払いの合計・1人あたり・メンバーごとの内訳と、「あなたが受け取る金額／支払う金額」、あなたがだれにいくら送ればいい（受け取ればいい）かが表示されます。ほかのメンバーの金額と送金のしかたは、レシートの下の「ほかのメンバーの精算」を開くと見られます。
        </p>
        <div className="mt-4 rounded-lg border border-line-soft bg-paper px-3.5 py-4 sm:px-4.5">
          <p className="font-bold text-ink">計算のしかた（沖縄旅行を4人で ¥76,000 使った例）</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-[13px] sm:text-sm">
              <thead>
                <tr className="text-ink-muted">
                  <th className="py-2 pr-1 text-left font-bold">人</th>
                  <th className="px-1 py-2 text-right font-bold sm:px-2">払った額</th>
                  <th className="px-1 py-2 text-right font-bold sm:px-2">負担額</th>
                  <th className="py-2 pl-1 text-right font-bold">収支</th>
                </tr>
              </thead>
              <tbody className="amount font-semibold">
                {example.map(([name, paid]) => {
                  const balance = paid - SHARE;
                  return (
                    <tr key={name} className="border-t border-line-soft">
                      <td className="py-2 pr-1 font-sans font-medium">{name}</td>
                      <td className="px-1 py-2 text-right sm:px-2">{formatYen(paid)}</td>
                      <td className="px-1 py-2 text-right sm:px-2">{formatYen(SHARE)}</td>
                      <td className={`py-2 pl-1 text-right ${balance > 0 ? "text-primary" : "text-pay"}`}>
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
            合計を人数で割った負担額と、実際に払った額の差が「収支」です。払う額が大きい人から、受け取る額が大きい人へ順に送金するので、この例では送金は「じろう → あきら ¥19,000」「はなこ → あきら ¥2,000」「はなこ → ゆうき ¥11,000」の3回で済みます。
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
          <p className="mt-2 leading-[1.8] text-ink-sub">
            プロジェクトの画面は「日程」「支払い」「精算」「メンバー」に分かれていて、スマホでは画面の下のタブ、PCでは上の切り替えで移ります（PCではメンバーは「支払い」の画面の横に出ます）。
          </p>

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
      <SiteFooter />
    </div>
  );
}
