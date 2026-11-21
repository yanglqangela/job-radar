import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { agentHref } from "../../lib/agent";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import type { PortfolioData } from "../../types.portfolio";
import { HeroPortrait } from "./HeroPortrait";

export function HeroSection({ data }: { data: PortfolioData }) {
  const { identity, hero, projects } = data;
  const reduced = usePrefersReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const title = hero.title || "把复杂流程，做成能用的 AI 产品";
  const titleLines = title.split(/(?<=，)/);

  useEffect(() => {
    if (reduced) return;
    const element = heroRef.current;
    if (!element || !window.matchMedia("(hover: hover)").matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = element.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        element.style.setProperty("--pf-mx", `${event.clientX - rect.left}px`);
        element.style.setProperty("--pf-my", `${event.clientY - rect.top}px`);
        element.style.setProperty("--pf-character-x", `${x * 12}px`);
        element.style.setProperty("--pf-character-y", `${y * 8}px`);
      });
    };

    element.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      element.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reduced]);

  const metaItems = [
    { label: "方向", value: identity.headline },
    { label: "常驻", value: identity.location },
    { label: "项目", value: `${projects.length} 个` },
    { label: "更新", value: data.contentUpdatedAt },
  ].filter((item) => Boolean(item.value));

  return (
    <section ref={heroRef} className="pf-hero pf-hero--spatial">
      <HeroPortrait projects={projects} />

      <div className="pf-hero-overlay">
        <div className="pf-container">
          <div className="pf-hero-copy">
            {identity.availability && (
              <p className="flex items-center gap-3 text-[13px] leading-relaxed text-[var(--pf-ink-soft)]">
                <span className="pf-status-dot" aria-hidden="true" />
                {identity.availability}
              </p>
            )}

            <h1 className="pf-hero-title mt-6">
              {titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>

            <div className="pf-hero-body mt-7 space-y-3">
              {(hero.paragraphs || []).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap items-baseline gap-x-8 gap-y-3 text-[14px]">
              <a href={agentHref()} className="pf-text-link pf-text-link--signal">
                问 Agent
              </a>
              <Link to="/projects" className="pf-text-link">
                进入项目展厅
              </Link>
              <Link to="/about" className="pf-text-link">
                经历与技能
              </Link>
              <Link to="/edit" className="pf-text-link">
                编辑入口
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="pf-hero-bottom">
        <div className="pf-container">
          {metaItems.length > 0 && (
            <dl className="pf-hero-meta">
              {metaItems.map((item) => (
                <div key={item.label}>
                  <dt className="pf-meta-label">{item.label}</dt>
                  <dd className="pf-meta-value">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="pf-hero-cue">
            <span>往下走，进项目</span>
            <span className="pf-hero-cue-line" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
