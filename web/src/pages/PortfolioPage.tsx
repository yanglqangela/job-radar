import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { NarrativeHome } from "../components/portfolio/NarrativeHome";
import { DEFAULT_TITLE, useDocumentTitle } from "../hooks/useDocumentTitle";
import { loadPortfolio } from "../lib/portfolio";
import type { PortfolioData } from "../types.portfolio";

export function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
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
      <div className="pf flex min-h-[100dvh] items-center justify-center">
        <p className="flex items-center gap-3 text-[13px] text-[var(--pf-ink-soft)]">
          <span className="pf-status-dot" aria-hidden="true" />
          正在读取作品集
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pf flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <h1 className="pf-serif text-2xl">作品集还没生成</h1>
        <p className="mt-3 max-w-md text-[13px] leading-relaxed text-[var(--pf-ink-soft)]">
          没有找到 data/portfolio.json。先运行
          <code className="mx-1 border-b border-[var(--pf-rule-strong)] pb-0.5">
            python scripts/build_portfolio.py
          </code>
          生成公开数据。
        </p>
        <Link to="/unlock" className="pf-text-link mt-6 text-[13px]">
          进入求职工作台
        </Link>
      </div>
    );
  }

  return (
    <div className="pf min-h-[100dvh] overflow-x-clip">
      <NarrativeHome data={data} />
      <div className="pf-grain" aria-hidden="true" />
    </div>
  );
}
