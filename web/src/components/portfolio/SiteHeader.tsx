import { Link } from "react-router-dom";
import { scrollToId } from "../../lib/scroll";
import type { PortfolioData } from "../../types.portfolio";

const NAV = [
  { id: "projects", label: "项目" },
  { id: "experience", label: "经历" },
  { id: "skills", label: "技能" },
  { id: "contact", label: "联系" },
];

export function SiteHeader({
  identity,
  workspace,
}: {
  identity: PortfolioData["identity"];
  workspace?: PortfolioData["workspace"];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-slate-50/85 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/80">
      <div className="portfolio-container flex h-14 items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0 })}
          className="flex min-w-0 items-baseline gap-2 text-left"
        >
          <span className="text-sm font-semibold tracking-tight">{identity.name}</span>
          <span className="hidden truncate text-[11px] uppercase tracking-[0.18em] text-slate-400 sm:inline">
            {identity.headlineEn}
          </span>
        </button>

        <nav className="flex items-center gap-1">
          <div className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToId(item.id)}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
              >
                {item.label}
              </button>
            ))}
          </div>
          <Link
            to="/unlock"
            className="ml-1 inline-flex items-center gap-1 rounded-full border border-slate-300/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-500 dark:hover:text-brand-200"
          >
            {workspace?.label || "工作台"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
