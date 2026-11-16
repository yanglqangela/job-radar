import { useRef } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import type { PortfolioData } from "../../types.portfolio";
import { ProjectCard } from "./ProjectCard";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

export function ProjectDeck({ data }: { data: PortfolioData }) {
  const deckRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const { projects } = data;

  function scrollByCards(direction: 1 | -1) {
    const deck = deckRef.current;
    if (!deck) return;
    const first = deck.firstElementChild as HTMLElement | null;
    const step = first ? first.getBoundingClientRect().width + 24 : deck.clientWidth * 0.85;
    deck.scrollBy({ left: direction * step, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <section id="projects" className="portfolio-section">
      <div className="portfolio-container">
        <SectionHeading
          index="02"
          title="项目"
          titleEn="Selected Work"
          description="三个从设计到上线的完整项目。每张卡片按「问题、角色、关键决策、结果」展开。"
        />
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400">横向滑动，或使用箭头</p>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="上一个项目"
              onClick={() => scrollByCards(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/80 text-slate-500 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-200"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="下一个项目"
              onClick={() => scrollByCards(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/80 text-slate-500 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-200"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="portfolio-container">
        <div
          ref={deckRef}
          className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain scroll-px-5 px-5 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8"
        >
          {projects.map((project, index) => (
            <Reveal
              key={project.slug}
              delay={index * 80}
              className="w-[86vw] max-w-[42rem] shrink-0 snap-start scroll-mt-24 sm:w-[70vw] lg:w-[42rem]"
            >
              <ProjectCard project={project} index={index} total={projects.length} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
