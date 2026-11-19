import Link from "next/link";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

// 利用規約・プライバシーポリシーの共通の枠。sections は [{ title, body }]
export default function LegalPage({ title, intro, sections, updatedAt }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader logoHref="/">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm font-medium text-ink-muted transition-colors hover:text-primary">
          ← トップへ
        </Link>
      </SiteHeader>

      <main className="mx-auto w-full max-w-170 flex-1 px-5 pt-6 pb-16 sm:px-6 sm:pt-10">
        <h1 className="heading text-[clamp(28px,4vw,36px)] leading-tight">{title}</h1>
        <p className="mt-3 leading-[1.85] text-ink-sub">{intro}</p>

        <ol className="mt-8 flex flex-col gap-7">
          {sections.map((section, index) => (
            <li key={section.title}>
              <h2 className="heading text-lg">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-2 flex flex-col gap-2 text-[15px] leading-[1.85] text-ink-sub [&_li]:ml-5 [&_li]:list-disc">
                {section.body}
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-sm text-ink-muted">制定日：{updatedAt}</p>
      </main>

      <SiteFooter />
    </div>
  );
}
