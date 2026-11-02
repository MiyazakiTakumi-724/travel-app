import Link from "next/link";

const logoClass = "font-display text-lg text-ink";

export default function SiteHeader({ logoHref, children }) {
  const logo = "旅行清算アプリ";

  return (
    <header className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 px-5 py-[18px] sm:px-6">
      {logoHref ? (
        <Link href={logoHref} className={`${logoClass} hover:text-primary`}>
          {logo}
        </Link>
      ) : (
        <span className={logoClass}>{logo}</span>
      )}
      {children}
    </header>
  );
}
