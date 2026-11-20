import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProjectDiagram } from "../components/portfolio/ProjectDiagram";
import { ProjectGallery } from "../components/portfolio/ProjectGallery";
import { ScrollProgress } from "../components/portfolio/ScrollProgress";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { assetUrl, loadPortfolio } from "../lib/portfolio";
import type { PortfolioData } from "../types.portfolio";

export function ProjectPage() {
  const { slug } = useParams();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const index = data && slug ? data.projects.findIndex((item) => item.slug === slug) : -1;
  const project = data && index >= 0 ? data.projects[index] : null;
  const total = data?.projects.length || 0;
  const prev = data && total > 1 ? data.projects[(index - 1 + total) % total] : null;
  const next = data && total > 1 ? data.projects[(index + 1) % total] : null;

  useDocumentTitle(
    project && data ? `${project.name} · ${data.identity.name}` : "项目案例",
  );

  if (loading) {
    return (
      <div className="pf flex min-h-[100dvh] items-center justify-center">
        <p className="flex items-center gap-3 text-[13px] text-[var(--pf-ink-soft)]">
          <span className="pf-status-dot" aria-hidden="true" />
          正在读取案例
        </p>
      </div>
    );
  }

  if (!data || !project) {
    return (
      <div className="pf flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <h1 className="pf-serif text-2xl">没有找到这个案例</h1>
        <p className="mt-3 text-[13px] text-[var(--pf-ink-soft)]">
          链接可能已经更新，回到作品集看看其他项目。
        </p>
        <Link to="/" className="pf-text-link mt-6 text-[13px]">
          返回作品集
        </Link>
      </div>
    );
  }

  const number = String(index + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");

  return (
    <div className="pf min-h-[100dvh] overflow-x-clip">
      <ScrollProgress />

      <header className="pf-detail-header">
        <div className="pf-container flex h-16 items-center justify-between gap-6">
          <Link to="/" className="pf-text-link text-[13px]">
            ← 返回作品集
          </Link>
          <span className="pf-serif text-[15px]">{data.identity.name}</span>
          <span className="hidden text-[12px] text-[var(--pf-ink-soft)] sm:inline">
            {data.identity.headlineEn}
          </span>
        </div>
      </header>

      <main>
        <section className="pf-detail-hero">
          <div className="pf-container pf-detail-hero-grid">
            <div className="pf-detail-hero-copy">
              <p className="pf-detail-kicker">
                案例 {number} / {totalLabel}
                {project.year ? ` · ${project.year}` : ""}
              </p>
              <h1 className="pf-detail-title">{project.name}</h1>
              <p className="pf-detail-pitch">{project.pitch}</p>
              {project.nameEn && <p className="pf-detail-name-en">{project.nameEn}</p>}
              {project.metrics.length === 0 && project.highlights.length > 0 && (
                <p className="pf-detail-tags">
                  {project.highlights.slice(0, 3).join(" / ")}
                </p>
              )}

              {project.metrics.length > 0 && (
                <div className="pf-metrics pf-detail-metrics">
                  {project.metrics.map((metric) => (
                    <div key={metric.label} className="pf-metric">
                      <p className="pf-metric-value">{metric.value}</p>
                      <p className="pf-metric-label">{metric.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pf-detail-hero-visual">
              <div className="pf-detail-plate">
                <span className="pf-detail-plate-label">
                  架构图{project.year ? ` · ${project.year}` : ""}
                </span>
                {project.cover ? (
                  <img
                    className="pf-detail-cover"
                    src={assetUrl(project.cover)}
                    alt={`${project.name} 项目封面`}
                  />
                ) : (
                  <ProjectDiagram slug={project.slug} />
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="pf-detail-main">
          <div className="pf-container pf-detail-grid">
            <aside className="pf-detail-aside">
              <dl className="pf-spec">
                {project.role && (
                  <div>
                    <dt>我的角色</dt>
                    <dd>{project.role}</dd>
                  </div>
                )}
                <div>
                  <dt>年份</dt>
                  <dd>{project.year || "—"}</dd>
                </div>
                {project.stack.length > 0 && (
                  <div>
                    <dt>技术栈</dt>
                    <dd>{project.stack.join("、")}</dd>
                  </div>
                )}
                {project.links.length > 0 && (
                  <div>
                    <dt>链接</dt>
                    <dd className="pf-spec-links">
                      {project.links.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="pf-text-link"
                        >
                          {link.label}
                        </a>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </aside>

            <div className="pf-detail-content">
              <ProjectGallery project={project} />

              {project.problem && (
                <section>
                  <h2>背景</h2>
                  <p className="pf-detail-copy pf-detail-lead">{project.problem}</p>
                </section>
              )}

              {project.decisions.length > 0 && (
                <section>
                  <h2>关键决策</h2>
                  <ul className="pf-decisions">
                    {project.decisions.map((decision) => (
                      <li key={decision.title} className="pf-decision">
                        <p className="pf-decision-title">{decision.title}</p>
                        <p className="pf-decision-detail">{decision.detail}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {project.backend && project.backend.length > 0 && (
                <section>
                  <h2>后台能力</h2>
                  <ul className="pf-decisions">
                    {project.backend.map((feature) => (
                      <li key={feature.title} className="pf-decision">
                        <p className="pf-decision-title">{feature.title}</p>
                        <p className="pf-decision-detail">{feature.detail}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {project.highlights.length > 0 && (
                <section>
                  <h2>结果</h2>
                  <ul className="pf-results">
                    {project.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>

          {total > 1 && next && (
            <div className="pf-container">
              <div className="pf-next">
                <Link to={`/project/${next.slug}`} className="pf-next-link">
                  <div className="pf-next-inner">
                    <div>
                      <p className="pf-next-label">下一个项目</p>
                      <p className="pf-serif pf-next-name">{next.name}</p>
                      {next.nameEn && <p className="pf-next-en">{next.nameEn}</p>}
                      <p className="pf-next-pitch">{next.pitch}</p>
                    </div>
                    <span className="pf-next-arrow" aria-hidden="true">
                      →
                    </span>
                  </div>
                </Link>
                {prev && (
                  <p className="pf-next-prev">
                    <Link to={`/project/${prev.slug}`} className="pf-text-link">
                      ← 上一个：{prev.name}
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="pf-detail-cta">
          <div className="pf-container flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="pf-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-tight">
                有合适的岗位，直接聊。
              </p>
              <p className="mt-2 text-[13px] text-[rgba(232,235,227,0.66)]">
                我目前在找 AI 应用开发 / AI 产品方向的机会。
              </p>
            </div>
            <div className="flex flex-wrap items-baseline gap-5">
              {data.contact.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="pf-contact-link text-[14px]"
                >
                  {link.label}
                </a>
              ))}
              <Link to="/" className="pf-contact-link text-[13px]">
                回到作品集
              </Link>
            </div>
          </div>
        </section>
      </main>

      <div className="pf-grain" aria-hidden="true" />
    </div>
  );
}
