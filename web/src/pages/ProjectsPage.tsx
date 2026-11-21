import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProjectDeck } from "../components/portfolio/ProjectDeck";
import { SiteHeader } from "../components/portfolio/SiteHeader";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { loadPortfolio } from "../lib/portfolio";
import type { PortfolioData } from "../types.portfolio";

export function ProjectsPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  useDocumentTitle(data ? `项目展厅 · ${data.identity.name}` : "项目展厅");

  useEffect(() => {
    let active = true;
    loadPortfolio().then((portfolio) => active && setData(portfolio));
    return () => {
      active = false;
    };
  }, []);

  if (!data) {
    return <PublicLoading label="正在读取项目展厅" />;
  }

  return (
    <div className="pf min-h-[100dvh] overflow-x-clip">
      <SiteHeader identity={data.identity} workspace={data.workspace} />
      <main className="pf-subpage-main">
        <div className="pf-container pf-page-intro">
          <p className="pf-page-kicker">SELECTED WORK / 2026</p>
          <h1 className="pf-page-title">项目展厅</h1>
          <p className="pf-page-lede">从求职 Agent、知识库问答到 AI 调研系统，每个项目都拆成一份可继续阅读的案例。</p>
        </div>
        <ProjectDeck data={data} />
      </main>
      <div className="pf-grain" aria-hidden="true" />
    </div>
  );
}

function PublicLoading({ label }: { label: string }) {
  return (
    <div className="pf flex min-h-[100dvh] items-center justify-center">
      <p className="flex items-center gap-3 text-[13px] text-[var(--pf-ink-soft)]">
        <span className="pf-status-dot" aria-hidden="true" />
        {label}
      </p>
      <Link to="/" className="sr-only">返回首页</Link>
    </div>
  );
}
