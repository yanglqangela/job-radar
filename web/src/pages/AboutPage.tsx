import { useEffect, useState } from "react";
import { ContactFooter } from "../components/portfolio/ContactFooter";
import { SiteHeader } from "../components/portfolio/SiteHeader";
import { SkillsSection } from "../components/portfolio/SkillsSection";
import { TimelineSection } from "../components/portfolio/TimelineSection";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { loadPortfolio } from "../lib/portfolio";
import type { PortfolioData } from "../types.portfolio";

export function AboutPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const reduced = usePrefersReducedMotion();
  useDocumentTitle(data ? `经历与技能 · ${data.identity.name}` : "经历与技能");

  useEffect(() => {
    let active = true;
    loadPortfolio().then((portfolio) => active && setData(portfolio));
    return () => {
      active = false;
    };
  }, []);

  if (!data) {
    return (
      <div className="pf flex min-h-[100dvh] items-center justify-center">
        <p className="flex items-center gap-3 text-[13px] text-[var(--pf-ink-soft)]">
          <span className="pf-status-dot" aria-hidden="true" />
          正在读取经历
        </p>
      </div>
    );
  }

  return (
    <div className="pf min-h-[100dvh] overflow-x-clip">
      <SiteHeader identity={data.identity} workspace={data.workspace} />
      <main className="pf-subpage-main">
        <div className="pf-container pf-page-intro">
          <p className="pf-page-kicker">PROFILE / EXPERIENCE</p>
          <h1 className="pf-page-title">经历与技能</h1>
          <p className="pf-page-lede">把算法、产品和交付放在同一张图里，按真实项目查看能力如何落地。</p>
        </div>
        <TimelineSection data={data} />
        <SkillsSection data={data} reduced={reduced} />
        <ContactFooter data={data} />
      </main>
      <div className="pf-grain" aria-hidden="true" />
    </div>
  );
}
