import type { PortfolioData } from "../../types.portfolio";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

export function SkillsSection({ data, reduced }: { data: PortfolioData; reduced: boolean }) {
  const { skills } = data;

  function jumpToProject(slug: string) {
    const element = document.getElementById(`project-${slug}`);
    element?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      inline: "center",
      block: "center",
    });
  }

  return (
    <section id="skills" className="portfolio-section">
      <div className="portfolio-container">
        <SectionHeading
          index="03"
          title={skills.title}
          titleEn={skills.titleEn}
          description="带蓝色标记的技能可以直接跳到对应项目，看它在真实场景里怎么用。"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.groups.map((group, index) => (
            <Reveal key={group.name} delay={index * 60}>
              <div className="card h-full p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold">{group.name}</h3>
                  {group.nameEn && (
                    <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      {group.nameEn}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {group.items.map((item) =>
                    item.evidence ? (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => jumpToProject(item.evidence || "")}
                        title="跳到对应项目"
                        className="chip border border-brand-200/80 bg-brand-50/70 text-brand-700 transition hover:border-brand-300 hover:bg-brand-100 dark:border-brand-800/60 dark:bg-brand-900/30 dark:text-brand-200 dark:hover:bg-brand-900/50"
                      >
                        {item.name}
                        <span className="ml-1 text-[9px] opacity-60">↗</span>
                      </button>
                    ) : (
                      <span
                        key={item.name}
                        className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {item.name}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
