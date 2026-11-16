import type { PortfolioData } from "../../types.portfolio";
import { clsx } from "../../lib/util";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

export function TimelineSection({ data }: { data: PortfolioData }) {
  const { timeline } = data;

  return (
    <section id="experience" className="portfolio-section">
      <div className="portfolio-container">
        <SectionHeading
          index="01"
          title={timeline.title}
          titleEn={timeline.titleEn}
          description="从算法工程到 AI 产品，两条线都做过；下面按时间倒序列出最近的工作与教育经历。"
        />

        <div className="grid gap-12 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-16">
          <aside className="md:sticky md:top-24 md:self-start">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Timeline</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              做过算法，也写过 PRD。习惯把技术方案和产品目标放在一起看。
            </p>
            {timeline.compactItems.length > 0 && (
              <div className="mt-8">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Awards & Certificates
                </p>
                <ul className="mt-3 space-y-2.5">
                  {timeline.compactItems.map((item) => (
                    <li key={`${item.kind}-${item.title}`} className="text-[13px] leading-snug">
                      <span className="block font-medium text-slate-700 dark:text-slate-200">
                        {item.title}
                      </span>
                      {item.meta && (
                        <span className="text-slate-400 dark:text-slate-500">{item.meta}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          <ol className="relative border-l border-slate-200 pl-6 dark:border-slate-800 sm:pl-8">
            {timeline.items.map((item, index) => (
              <li
                key={`${item.org}-${item.role}-${item.period}-${index}`}
                className="relative pb-12 last:pb-0"
              >
                <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-brand-600 bg-slate-50 sm:-left-[39px] dark:bg-slate-950" />
                <Reveal delay={index * 60}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {item.period && (
                      <span className="text-xs font-medium tabular-nums text-brand-600 dark:text-brand-300">
                        {item.period}
                      </span>
                    )}
                    <span
                      className={clsx(
                        "chip",
                        item.kind === "work"
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                      )}
                    >
                      {item.kind === "work" ? "工作" : "教育"}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight">{item.org}</h3>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {item.role}
                    {item.location ? ` · ${item.location}` : ""}
                  </p>
                  {item.bullets.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {item.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:h-1 before:w-1 before:rounded-full before:bg-slate-300 dark:before:bg-slate-600"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="chip bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
