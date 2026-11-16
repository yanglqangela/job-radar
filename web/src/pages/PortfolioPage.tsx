import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ContactFooter } from "../components/portfolio/ContactFooter";
import { HeroSection } from "../components/portfolio/HeroSection";
import { ProjectDeck } from "../components/portfolio/ProjectDeck";
import { ScrollProgress } from "../components/portfolio/ScrollProgress";
import { SiteHeader } from "../components/portfolio/SiteHeader";
import { SkillsSection } from "../components/portfolio/SkillsSection";
import { TimelineSection } from "../components/portfolio/TimelineSection";
import { DEFAULT_TITLE, useDocumentTitle } from "../hooks/useDocumentTitle";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { loadPortfolio } from "../lib/portfolio";
import type { PortfolioData } from "../types.portfolio";

export function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const reduced = usePrefersReducedMotion();
  useDocumentTitle(data?.seo?.title || DEFAULT_TITLE);

  useEffect(() => {
    let active = true;
    loadPortfolio().then((portfolio) => {
      if (!active) return;
      setData(portfolio);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Loading portfolio</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <p className="portfolio-eyebrow">Portfolio</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">作品集正在准备中</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          还没有找到 data/portfolio.json。先运行
          <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-[12px] dark:bg-slate-800">
            python scripts/build_portfolio.py
          </code>
          生成公开数据。
        </p>
        <Link to="/unlock" className="btn-ghost mt-6">
          进入求职工作台
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <ScrollProgress />
      <SiteHeader identity={data.identity} workspace={data.workspace} />
      <main>
        <HeroSection data={data} />
        <TimelineSection data={data} />
        <ProjectDeck data={data} />
        <SkillsSection data={data} reduced={reduced} />
        <ContactFooter data={data} />
      </main>
    </div>
  );
}
