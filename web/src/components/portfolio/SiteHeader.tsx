import { Link, useLocation } from "react-router-dom";
import { agentHref, workspaceHref } from "../../lib/agent";
import { clsx } from "../../lib/util";
import type { PortfolioData } from "../../types.portfolio";

const NAV = [
  { to: "/projects", label: "项目" },
  { to: "/about", label: "经历与技能" },
  { to: "/edit", label: "编辑入口" },
];

export function SiteHeader({
  identity,
  workspace,
}: {
  identity: PortfolioData["identity"];
  workspace?: PortfolioData["workspace"];
}) {
  const location = useLocation();

  return (
    <header className="pf-header">
      <div className="pf-container flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex min-w-0 items-baseline gap-2.5 text-left">
          <span className="pf-serif text-[17px] leading-none">{identity.name}</span>
          <span className="hidden truncate text-[12px] text-[var(--pf-ink-soft)] sm:inline">
            {identity.headlineEn}
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-[13px]" aria-label="页面导航">
          <div className="hidden items-center gap-5 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={clsx(
                  "pf-nav-link text-[var(--pf-ink-soft)]",
                  location.pathname === item.to && "pf-nav-link--active",
                )}
                aria-current={location.pathname === item.to ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <a href={agentHref()} className="pf-text-link pf-agent-entry">
            问 Agent
          </a>
          <a href={workspaceHref()} className="pf-text-link">
            {workspace?.label || "求职工作台"}
          </a>
        </nav>
      </div>
    </header>
  );
}

