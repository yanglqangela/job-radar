import { scrollToId } from "../../lib/scroll";
import type { PortfolioData } from "../../types.portfolio";

export function HeroSection({ data }: { data: PortfolioData }) {
  const { identity, hero, projects } = data;

  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(70% 60% at 78% 12%, rgba(26,110,245,0.12), rgba(26,110,245,0) 70%)",
        }}
      />
      <div className="portfolio-container relative flex min-h-[88svh] flex-col justify-center py-24 sm:py-28">
        <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="portfolio-eyebrow">
              {hero.eyebrow || "你好，我是"} {identity.name}
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              {hero.title || "把复杂流程，做成能用的 AI 产品"}
            </h1>
            {hero.subtitleEn && (
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">
                {hero.subtitleEn}
              </p>
            )}
            <div className="mt-6 max-w-2xl space-y-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
              {(hero.paragraphs || []).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-primary px-5 py-2.5"
                onClick={() => scrollToId("projects")}
              >
                查看项目
              </button>
              <button
                type="button"
                className="btn-ghost px-5 py-2.5"
                onClick={() => scrollToId("contact")}
              >
                联系我
              </button>
              {identity.availability && (
                <span className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {identity.availability}
                </span>
              )}
            </div>
          </div>

          <dl className="grid gap-5 border-slate-200 pl-0 sm:grid-cols-3 lg:grid-cols-1 lg:border-l lg:pl-8 dark:border-slate-800">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Projects</dt>
              <dd className="mt-1 text-sm font-medium">{projects.length} 个完整项目</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Focus</dt>
              <dd className="mt-1 text-sm font-medium">{identity.headline}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Base</dt>
              <dd className="mt-1 text-sm font-medium">{identity.location || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-16 flex items-end justify-between gap-4 text-[11px] uppercase tracking-[0.2em] text-slate-400">
          <span className="inline-flex items-center gap-2">
            <span className="motion-safe:animate-bounce">↓</span>
            {hero.scrollHint || "向下滚动"}
          </span>
          <span className="hidden sm:inline">{identity.nameEn}</span>
        </div>
      </div>
    </section>
  );
}
