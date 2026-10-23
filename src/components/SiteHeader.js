import Link from "next/link";

const logoClass = "font-mono text-[15px] font-bold tracking-[0.06em] text-ink";

export default function SiteHeader({ logoHref, children }) {
  return (
    <header className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-4 border-b-[1.5px] border-ink px-6 py-[18px]">
      {logoHref ? (
        <Link href={logoHref} className={`${logoClass} hover:text-primary`}>
          旅行清算アプリ
        </Link>
      ) : (
        <span className={logoClass}>旅行清算アプリ</span>
      )}
      {children}
    </header>
  );
}
