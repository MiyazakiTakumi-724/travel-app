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
// この例の送金（払う額が大きい人から、受け取る額が大きい人へ）
const transfersExample = [
  ["じろう", "あきら", 19000],
  ["はなこ", "あきら", 2000],
  ["はなこ", "ゆうき", 11000],
];
const example = [
  ["あきら", 40000],
  ["ゆうき", 30000],
  ["はなこ", 6000],
  ["じろう", 0],
];

// 画面のボタンや項目の名前。本文の中で目立つよう太字にする
// 短い名前は途中で改行しない（「編 / 集」のように切れないように）。長い名前は、はみ出さないよう折り返してよい
function UI({ children }) {
  const short = String(children).length <= 12;
  return <span className={`text-ink ${short ? "whitespace-nowrap" : ""}`}>「{children}」</span>;
}

// とくに大事なこと。見出しの太字と紛れないよう、赤いアンダーラインで示す
function Em({ children }) {
  return <span className="text-ink underline decoration-pay/70 decoration-2 underline-offset-[5px]">{children}</span>;
}

// PCでだけ出す補足（スマホでは少し簡単にして、ページを短くする）
function Pc({ children }) {
  return <span className="max-md:hidden">{children}</span>;
}

// ステップの中の小見出し
function Sub({ children }) {
  return <h3 className="mt-4 mb-1 text-[15px] font-black text-ink md:mt-5 md:text-base">{children}</h3>;
}

// 覚えておくと便利なこと
function Tip({ children }) {
  return (
    <p className="mt-3 rounded-lg bg-sky-ground px-3.5 py-2.5 text-sm leading-relaxed">
      <b className="mr-1.5 text-primary">ポイント</b>
      {children}
    </p>
  );
}

// 気をつけること
function Caution({ children }) {
  return (
    <p className="mt-3 rounded-lg bg-[#FCECE8] px-3.5 py-2.5 text-sm leading-relaxed">
      <b className="mr-1.5 text-pay">注意</b>
      {children}
    </p>
  );
}

const steps = [
  {
    id: "login",
    title: "はじめる（Googleかゲスト）",
    body: (
      <>
        <Sub>Googleで始める</Sub>
        <p>
          トップページの<UI>Googleでログイン</UI>を押します。はじめてのときは、メンバーに表示するニックネーム（10文字まで）を決めます。参加しているプロジェクトは、マイプロジェクトからいつでも開けます。
        </p>

        <Sub>ゲストで始める（アカウントなし）</Sub>
        <p>
          トップページの<UI>ゲストでプロジェクトを作成</UI>から作るか、招待リンクを開いて<UI>ゲストとして参加</UI>を押します。ニックネームだけで使えます。
        </p>
        <ul className="mt-2 list-disc pl-5">
          <li>
            参加すると<Em>復帰用コード</Em>（例：<span className="whitespace-nowrap">K7QM3-XRP4N</span>）と<Em>専用リンク</Em>が出ます。別の端末から戻るときに使うので、必ず控えておきます。
          </li>
          <li>
            同じブラウザなら、次からはトップページの<UI>このブラウザで参加中のプロジェクト</UI>からコードなしで開けます。
          </li>
          <li>
            別のスマホやブラウザでは、トップページの<UI>復帰用コードで戻る</UI>にコードを入れるか、専用リンクを開きます。
          </li>
          <li>
            「メンバー」の画面の<UI>復帰用コードを見る</UI>でいつでも確かめられ、なくしたときは<UI>コードを発行し直す</UI>で作り直せます<Pc>（本人か幹事。幹事が発行し直したコードは、その幹事にも見えます）</Pc>。
          </li>
          <li>
            「メンバー」の画面の<UI>Googleでログインして引き継ぐ</UI>で、ゲストのときの記録をそのままGoogleアカウントに移せます。
          </li>
          <li>
            共用のパソコンなどで使ったときは、<UI>このブラウザからログアウト</UI>で、ゲストとしてのログイン状態を消せます。
          </li>
        </ul>
        <Caution>復帰用コードと専用リンクを知っている人は、あなたとして操作できます。人には教えないでください。</Caution>

        <Sub>アカウントを削除する</Sub>
        <p>
          Googleでログインしている人は、マイプロジェクトの画面のいちばん下の<UI>アカウントを削除</UI>から、いつでも削除できます。<Pc>支払いの記録があるプロジェクトでは、ほかのメンバーの精算が変わらないよう、ニックネームと記録だけが「退会済み」として残ります。</Pc>
        </p>
      </>
    ),
  },
  {
    id: "create",
    title: "プロジェクトを作る",
    body: (
      <>
        <p>
          マイプロジェクトの<UI>新しいプロジェクトを作成</UI>（ゲストのときはトップページの<UI>ゲストでプロジェクトを作成</UI>）から、タイトル（必須）と目的地を入れ、日程の決め方を選びます。
        </p>
        <ul className="mt-2 list-disc pl-5">
          <li>
            これから決める：旅行の日数（例：2泊3日）と、行ける日を聞く期間（例：11/1〜11/30。3か月まで）を入れます。<Pc>メンバーの行ける日を集めて決めます（ステップ4）。</Pc>
          </li>
          <li>
            決まっている：開始日と終了日を入れます。開始日を入れてから<UI>旅行の日数</UI>を選ぶと、終了日が自動で入ります（1か月まで）。
          </li>
        </ul>

        <Sub>幹事について</Sub>
        <p>
          プロジェクトを作った人は<Em>幹事</Em>になります。次のことは、幹事だけができます。
        </p>
        <ul className="mt-2 list-disc pl-5">
          <li>プロジェクトの編集（右上の<UI>編集</UI>）・削除</li>
          <li>日程の仮決定・取り消し・決め直し</li>
          <li>メンバーを外す、ゲストの復帰用コードを発行し直す、招待リンクを作り直す</li>
        </ul>
        <p className="mt-2">
          「メンバー」の画面でほかのメンバーをタップし、<UI>幹事にする</UI>を押すと、幹事を何人でも増やせます。自分は<UI>幹事をやめる</UI>でやめられます（ほかに幹事がいるときだけ）。
        </p>
        <Tip>幹事が1人だけだと、その人が使えなくなったときに困ります。2人以上にしておくと安心です。</Tip>
      </>
    ),
  },
  {
    id: "invite",
    title: "友達を招待する",
    body: (
      <>
        <p>
          「メンバー」の画面に招待リンクが出ています（PCは右上の<UI>メンバーを招待</UI>からも開けます）。横のボタンで、スマホなら<UI>送る</UI>（共有メニューからLINEなどで送る）、PCなら<UI>コピー</UI>を押します。コピーがうまくいかないときは、リンクの文字を長押しや選択で写せます。
        </p>
        <p className="mt-2">
          リンクを開いた友達は、Googleでログインするか、ゲストとして参加すると、メンバーになります。<Pc>LINE などで送ると、旅行の名前・目的地・日程がプレビューに出ます。招待画面にも、目的地・日程・幹事・参加人数が出るので、似た旅行と見分けられます。</Pc>
        </p>
        <Tip>
          招待リンクが知らない人に広まってしまったときは、幹事が<UI>招待リンクを作り直す</UI>を押すと、前のリンクは使えなくなります（参加済みのメンバーはそのままです）。
        </Tip>

        <Sub>メンバーを外す・自分で抜ける</Sub>
        <ul className="mt-1 list-disc pl-5">
          <li>
            幹事は、メンバーをタップして<UI>メンバーから外す</UI>で外せます。
          </li>
          <li>
            自分で抜けるときは、「メンバー」の画面のいちばん下の<UI>このプロジェクトを抜ける</UI>を押します。
          </li>
        </ul>
        <Caution>
          支払いの記録がある人は、精算の金額が変わらないよう、外すことも抜けることもできません。また、幹事が自分だけのときは抜けられないので、先にほかのメンバーを幹事にしてください。
        </Caution>
      </>
    ),
  },
  {
    id: "schedule",
    title: "日程を決める",
    body: (
      <>
        <p>
          日程をこれから決めるプロジェクトは、「日程」の画面から始まります。<Pc>画面の上に、今どの段階かが出ます。</Pc>
        </p>
        <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5">
          <li>
            行ける日を提出：カレンダーで行ける日をタップして選び、<UI>行ける日を提出する</UI>を押します。
            <UI>全部</UI>
            <UI>土日祝だけ</UI>
            <UI>全部外す</UI>でまとめて選ぶこともできます。提出したあとも、仮決定されるまでは<UI>修正する</UI>で直せます。
          </li>
          <li>
            幹事が仮決定：全員の提出が終わると、幹事はみんなの行ける日の表を見て出発日を選び、<UI>この日程で仮決定する</UI>を押します。
          </li>
          <li>
            ○×で回答：メンバーは、仮決定の日程に<UI>○ 行ける</UI>か<UI>× 行けない</UI>で答えます。
          </li>
          <li>
            確定：全員が ○ と答えると、自動で日程が確定します。× の人がいたら、幹事が<UI>仮決定を取り消して選び直す</UI>で選び直します。メンバーが幹事1人だけのときは、仮決定した時点で確定します。
          </li>
        </ol>
        <ul className="mt-3 list-disc pl-5">
          <li>
            みんなの行ける日の表は、○ が行ける日です。一番下の<Em>行ける人数は、提出した人だけで数えます</Em>（まだ提出していない人は薄く表示されます）。
          </li>
          <li>
            行ける日の提出や ○× の回答など、自分がやることがあるときは、「日程」のタブに赤い点が付きます。
          </li>
          <li>
            日程が確定したあとでも、幹事は<UI>日程を決め直す</UI>で、仮決定からやり直せます（みんなの行ける日はそのまま）。
          </li>
        </ul>

        <Sub>旅行の予定を書き込む</Sub>
        <p>
          日程が決まると、「日程」の画面に日ごとの旅行の予定が出ます。<UI>予定を追加</UI>から、集合時間や行きたい場所をメンバーみんなで書き込めます。
        </p>
        <ul className="mt-2 list-disc pl-5">
          <li>時刻はなくてもかまいません。入れた時刻は、横の × で消せます。</li>
          <li>
            書いた予定はタップすると直したり消したりできます。消した直後は、画面の下の<UI>元に戻す</UI>で取り消せます。
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "record",
    title: "支払いを記録する",
    body: (
      <>
        <p>
          <UI>支払い記録</UI>のボタン（スマホは画面の下、PCは右上の<UI>支払いを記録</UI>）から、金額・内容・支払った人（1人）を入れます。支払った人は、最初は自分が選ばれています。
        </p>
        <ul className="mt-2 list-disc pl-5">
          <li>記録はメンバー全員が見られ、誰でも直したり消したりできます。行をタップすると、編集の画面が開きます。</li>
          <li>
            消した直後は、画面の下の<UI>元に戻す</UI>で取り消せます。
          </li>
          <li>
            「支払い」の画面の上で名前を押すと、その人が払った分だけを見られます。<Em>続けて押すと何人でも選べ</Em>、<UI>全員</UI>で元に戻ります。
          </li>
        </ul>
        <Tip>スマホでは、画面の下にいつも自分の精算額と<UI>支払い記録</UI>のボタンが出ているので、払ったその場ですぐ記録できます。</Tip>
      </>
    ),
  },
  {
    id: "settle",
    title: "精算する",
    body: (
      <>
        <p>
          「精算」の画面の精算レシートに、支払いの合計・1人あたり・メンバーごとの内訳と、あなたが受け取る金額（または支払う金額）、誰にいくら送ればいいかが上から順に出ます。ほかのメンバーの金額と送金のしかたは、レシートの下の<UI>ほかのメンバーの精算</UI>を開くと見られます。
        </p>
        <div className="mt-4 rounded-lg border border-line-soft bg-paper px-3.5 py-4 sm:px-4.5">
          <p className="font-bold text-ink">計算のしかた</p>
          <p className="text-sm text-ink-muted">例：沖縄旅行を4人で、合計 ¥76,000 使った場合</p>
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
            合計を人数で割った負担額と、実際に払った額の差が収支です。払う額が大きい人から、受け取る額が大きい人へ順に送金するので、この例では送金は次の3回で済みます。
          </p>
          <ul className="mt-2 flex flex-col gap-1 rounded-lg bg-sky-ground/60 px-3.5 py-2.5 text-sm">
            {transfersExample.map(([from, to, amount]) => (
              <li key={`${from}-${to}`} className="flex justify-between gap-3">
                <span>
                  {from} <span className="text-pay">→</span> {to}
                </span>
                <span className="amount font-semibold text-ink">{formatYen(amount)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">
            <Em>割り切れないときの端数（数円）は、多く払った人が1円ずつ負担します。</Em>そのぶん受け取る金額が少し減りますが、表示される金額と送金の合計はぴったり合います。
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
                  className="phrase block border-l-3 border-line-soft px-3 py-2 text-ink-sub transition-colors hover:border-primary hover:text-primary">
                  {index + 1}. {step.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 max-w-170">
          <h1 className="heading text-[clamp(30px,4vw,38px)] leading-tight">使い方</h1>
          <p className="mt-2 leading-[1.8] text-ink-sub">旅行の準備から精算まで、6つのステップで使えます。</p>
          <p className="mt-2 text-[14px] leading-[1.75] text-ink-sub max-md:[font-feature-settings:'palt'] md:text-base md:leading-[1.8]">
            <span className="md:hidden">プロジェクトの画面は、下のタブで「日程」「支払い」「精算」「メンバー」を切り替えます。</span>
            <Pc>
              プロジェクトの画面は「日程」「支払い」「精算」「メンバー」の4つに分かれています。スマホでは画面の下のタブ、PCでは上の切り替えで移ります（PCでは、メンバーは「支払い」の画面の右側に出ます）。
            </Pc>
          </p>

          <ol className="mt-4">
            {steps.map((step, index) => (
              // スマホでは番号と見出しを横に並べ、本文は画面の幅いっぱいに使う。PCでは番号の列を左に取る
              <li key={step.id} id={step.id} className="mt-8 grid scroll-mt-6 md:mt-10 grid-cols-[36px_1fr] gap-x-3 md:grid-cols-[44px_1fr] md:gap-x-4.5">
                <span
                  aria-hidden="true"
                  className={`grid size-9 place-items-center rounded-full amount text-lg text-white md:size-11 md:text-xl ${
                    index === steps.length - 1 ? "bg-pay" : "bg-primary"
                  }`}>
                  {index + 1}
                </span>
                <h2 className="self-center heading text-xl text-ink">{step.title}</h2>
                <div className="col-span-2 mt-1 min-w-0 text-[14px] leading-[1.75] text-ink-sub max-md:[font-feature-settings:'palt'] md:col-span-1 md:col-start-2 md:mt-1.5 md:text-[15px] md:leading-[1.85]">
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
