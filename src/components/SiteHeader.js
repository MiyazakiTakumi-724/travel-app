import Link from "next/link";

const logoClass = "font-display text-lg text-ink";

export default function SiteHeader({ logoHref, children }) {
  const logo = "旅行清算アプリ";

  return (
    <header className="mx-auto flex w-full max-w-280 flex-wrap items-center justify-between gap-4 px-5 py-4.5 sm:px-6">
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
