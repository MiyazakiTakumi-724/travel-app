import Link from "next/link";

const logoClass = "inline-flex items-center gap-2 heading text-lg text-ink";

// 上下に切り欠きのある小さなきっぷのマーク
function LogoMark() {
  return (
    <span
      aria-hidden="true"
      className="block h-3.5 w-5.5 rounded-[3px] bg-primary [mask:radial-gradient(circle_3px_at_50%_0,#0000_98%,#000)_top/100%_51%_no-repeat,radial-gradient(circle_3px_at_50%_100%,#0000_98%,#000)_bottom/100%_51%_no-repeat]"
    />
  );
}

export default function SiteHeader({ logoHref, children }) {
  const logo = (
    <>
      <LogoMark />
      旅行清算アプリ
    </>
  );

  return (
    <header className="mx-auto flex w-full max-w-280 flex-wrap items-center justify-between gap-4 px-5 py-4.5 sm:px-6">
      {logoHref ? (
        <Link href={logoHref} className={`${logoClass} hover:text-primary`}>
          {logo}
        </Link>
      ) : (
        <span className={logoClass}>{logo}</span>
      )}
      <div className="flex items-center gap-4 sm:gap-5">{children}</div>
    </header>
  );
}

// ヘッダー右側に置く「使い方」へのリンク
export function GuideLink() {
  return (
    <Link
      href="/guide"
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-primary-hover">
      <span
        aria-hidden="true"
        className="grid size-4.5 place-items-center rounded-full border-2 border-current text-[11px] font-black leading-none">
        ?
      </span>
      使い方
    </Link>
  );
}
