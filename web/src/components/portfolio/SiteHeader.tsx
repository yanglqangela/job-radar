import { useEffect, useState } from "react";
import { agentHref, workspaceHref } from "../../lib/agent";
import { scrollToId } from "../../lib/scroll";
import { clsx } from "../../lib/util";
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
  const [active, setActive] = useState("");

  useEffect(() => {
    const sections = NAV.map((item) => document.getElementById(item.id)).filter(
      (section): section is HTMLElement => Boolean(section),
    );
    if (!sections.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-24% 0px -58% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header className="pf-header">
      <div className="pf-container flex h-16 items-center justify-between gap-6">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0 })}
          className="flex min-w-0 items-baseline gap-2.5 text-left"
        >
          <span className="pf-serif text-[17px] leading-none">{identity.name}</span>
          <span className="hidden truncate text-[12px] text-[var(--pf-ink-soft)] sm:inline">
            {identity.headlineEn}
          </span>
        </button>

        <nav className="flex items-center gap-5 text-[13px]" aria-label="页面导航">
          <div className="hidden items-center gap-5 sm:flex">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToId(item.id)}
                className={clsx(
                  "pf-nav-link text-[var(--pf-ink-soft)]",
                  active === item.id && "pf-nav-link--active",
                )}
                aria-current={active === item.id ? "true" : undefined}
              >
                {item.label}
              </button>
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

