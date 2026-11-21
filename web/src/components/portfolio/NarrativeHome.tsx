import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PortfolioData, PortfolioProject } from "../../types.portfolio";
import { agentHref, workspaceHref } from "../../lib/agent";
import { assetUrl } from "../../lib/portfolio";
import { ScrollProgress } from "./ScrollProgress";

type ProjectFilter = "all" | "agent" | "product" | "engineering";

const FILTERS: Array<{ id: ProjectFilter; label: string }> = [
  { id: "all", label: "全部项目" },
  { id: "agent", label: "Agent 系统" },
  { id: "product", label: "产品系统" },
  { id: "engineering", label: "工程与算法" },
];

const AGENT_PROMPTS = [
  "OfferPilot 为什么把 Java 和 Python 分开？",
  "请用面试语言讲一下 DocQA 的取舍。",
  "DO&SH 后台如何承接双品牌运营？",
];

function projectKind(slug: string): Exclude<ProjectFilter, "all"> {
  if (slug === "lq-agent" || slug === "kb-agent") return "agent";
  if (slug === "dosh-global" || slug === "cpi") return "product";
  return "engineering";
}

function projectLabel(project: PortfolioProject) {
  if (project.slug === "lq-agent") return "端到端交付";
  if (project.slug === "kb-agent") return "Agent 工作流";
  if (project.slug === "job-radar") return "零服务器产品";
  if (project.slug === "dosh-global") return "业务系统";
  return "调研与决策";
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`homex-reveal ${className}`} data-reveal>
      {children}
    </div>
  );
}

export function NarrativeHome({ data }: { data: PortfolioData }) {
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [selectedSlug, setSelectedSlug] = useState(data.projects[0]?.slug || "");
  const [agentPrompt, setAgentPrompt] = useState(AGENT_PROMPTS[0]);

  const filteredProjects = useMemo(
    () =>
      data.projects.filter(
        (project) => filter === "all" || projectKind(project.slug) === filter,
      ),
    [data.projects, filter],
  );

  useEffect(() => {
    if (!filteredProjects.some((project) => project.slug === selectedSlug)) {
      setSelectedSlug(filteredProjects[0]?.slug || data.projects[0]?.slug || "");
    }
  }, [data.projects, filteredProjects, selectedSlug]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!nodes.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8%" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".homex-hero");
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = hero.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        hero.style.setProperty("--homex-mx", `${x * 12}px`);
        hero.style.setProperty("--homex-my", `${y * 10}px`);
      });
    };
    hero.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      hero.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const selectedProject =
    data.projects.find((project) => project.slug === selectedSlug) || data.projects[0];
  const skillsCount = data.skills.groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <div className="homex">
      <ScrollProgress />

      <header className="homex-header">
        <div className="homex-container homex-header-inner">
          <a className="homex-brand" href="#top" aria-label="返回首页">
            <span className="homex-brand-mark">YLQ</span>
            <span>
              <strong>{data.identity.name}</strong>
              <small>AI ENGINEER / PRODUCT</small>
            </span>
          </a>
          <nav className="homex-nav" aria-label="首页导航">
            <a href="#story">方法</a>
            <a href="#projects">项目</a>
            <a href="#agent">Agent</a>
            <a href="#career">求职雷达</a>
          </nav>
          <Link className="homex-header-cta" to="/about">
            了解我
          </Link>
        </div>
      </header>

      <main id="top">
        <section className="homex-hero">
          <div className="homex-hero-grid homex-container">
            <div className="homex-hero-copy">
              <Reveal>
                <p className="homex-eyebrow">
                  <span className="homex-live-dot" aria-hidden="true" />
                  {data.identity.availability || "开放 AI 应用开发与产品机会"}
                </p>
              </Reveal>
              <Reveal className="homex-reveal--delay-1">
                <h1>
                  把复杂的流程，
                  <em>变成能被信任的产品。</em>
                </h1>
              </Reveal>
              <Reveal className="homex-reveal--delay-2">
                <p className="homex-hero-lede">
                  我是杨李清，做 AI 应用开发，也做 AI 产品。习惯从问题定义开始，把原型、接口、模型和上线交付连成一条线。
                </p>
              </Reveal>
              <Reveal className="homex-reveal--delay-3">
                <div className="homex-actions">
                  <a className="homex-button homex-button--primary" href="#projects">
                    进入项目展厅
                  </a>
                  <a className="homex-button homex-button--quiet" href={agentHref()}>
                    问公开 Agent
                  </a>
                </div>
              </Reveal>
              <Reveal className="homex-reveal--delay-4">
                <div className="homex-hero-footnote">
                  <span>重庆 / 杭州</span>
                  <span>计算机技术 · 硕士在读</span>
                  <span>2026 portfolio</span>
                </div>
              </Reveal>
            </div>

            <div className="homex-hero-visual" aria-label="个人形象与能力轨迹">
              <div className="homex-visual-glow homex-visual-glow--one" />
              <div className="homex-visual-glow homex-visual-glow--two" />
              <div className="homex-orbit homex-orbit--one" />
              <div className="homex-orbit homex-orbit--two" />
              <div className="homex-visual-label homex-visual-label--top">FROM PROBLEM</div>
              <div className="homex-visual-label homex-visual-label--bottom">TO SHIPPING</div>
              <img
                className="homex-hero-character"
                src={assetUrl("assets/hero-character.png")}
                alt=""
              />
              <div className="homex-hero-card homex-hero-card--top">
                <span className="homex-card-kicker">CURRENT FOCUS</span>
                <strong>AI 产品与工程交付</strong>
                <span>需求 · 系统 · 结果</span>
              </div>
              <div className="homex-hero-card homex-hero-card--bottom">
                <span className="homex-card-kicker">WORKING PRINCIPLE</span>
                <strong>证据先于结论</strong>
                <span>可解释，可复盘，可继续</span>
              </div>
            </div>
          </div>
          <div className="homex-hero-metrics homex-container">
            <div>
              <strong>{data.projects.length}</strong>
              <span>公开项目</span>
            </div>
            <div>
              <strong>{skillsCount}+</strong>
              <span>技能证据</span>
            </div>
            <div>
              <strong>3</strong>
              <span>工作台入口</span>
            </div>
            <a href="#story" className="homex-scroll-cue">
              向下阅读故事 <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>

        <section id="story" className="homex-story homex-section">
          <div className="homex-container">
            <Reveal>
              <div className="homex-section-heading">
                <span className="homex-section-index">01 / HOW I WORK</span>
                <h2>先看方法，<em>再看结果。</em></h2>
                <p>
                  我的项目从来不是单点的模型演示。每一次交付都要回答三个问题，问题是否被说清楚，系统是否能稳定运行，结果是否能被继续使用。
                </p>
              </div>
            </Reveal>
            <div className="homex-method-grid">
              {[
                ["01", "理解问题", "把模糊需求拆成用户、场景、约束和可以验证的结果。"],
                ["02", "搭建系统", "让模型、工具、数据和界面各自承担清晰职责，失败时也能恢复。"],
                ["03", "交付闭环", "把演示推进到真实流程，留下来源、状态和下一步，让团队接得住。"],
              ].map(([index, title, text]) => (
                <Reveal key={index} className="homex-method-card">
                  <span className="homex-method-index">{index}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <span className="homex-method-line" aria-hidden="true" />
                </Reveal>
              ))}
            </div>
            <div className="homex-story-aside">
              <span>我做的事</span>
              <strong>把 AI 能力放进真实的工作流里。</strong>
              <Link to="/about">查看经历与技能</Link>
            </div>
          </div>
        </section>

        <section id="projects" className="homex-projects homex-section">
          <div
            className="homex-project-backdrop"
            aria-hidden="true"
            style={{ backgroundImage: `url(${assetUrl("assets/project-gallery-background.png")})` }}
          />
          <div className="homex-container homex-projects-inner">
            <Reveal>
              <div className="homex-section-heading homex-section-heading--wide">
                <span className="homex-section-index">02 / PROJECT EXHIBITION</span>
                <div className="homex-heading-row">
                  <h2>项目展厅</h2>
                  <p>从求职 Agent 到企业后台，每个项目都保留了问题、取舍与证据。</p>
                </div>
              </div>
            </Reveal>

            <div className="homex-filter-bar" role="tablist" aria-label="项目筛选">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.id}
                  className={filter === item.id ? "is-active" : ""}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
              <span className="homex-filter-count">{filteredProjects.length} 项</span>
            </div>

            <div className="homex-project-grid">
              {filteredProjects.map((project, index) => (
                <Reveal
                  key={project.slug}
                  className={`homex-project-card-wrap ${index === 0 ? "is-featured" : ""}`}
                >
                  <article
                    className={`homex-project-card ${selectedSlug === project.slug ? "is-selected" : ""}`}
                  >
                    <button
                      type="button"
                      className="homex-project-hit"
                      onClick={() => setSelectedSlug(project.slug)}
                    >
                      <div className="homex-project-media">
                        {project.cover ? (
                          <img
                            src={assetUrl(project.cover)}
                            alt={`${project.name} 项目封面`}
                            loading={index > 1 ? "lazy" : "eager"}
                          />
                        ) : (
                          <div className="homex-project-media-fallback">{project.nameEn}</div>
                        )}
                        <span className="homex-project-type">{projectLabel(project)}</span>
                        <span className="homex-project-year">{project.year}</span>
                      </div>
                      <div className="homex-project-copy">
                        <div className="homex-project-title-row">
                          <div>
                            <span>{project.nameEn || "Selected work"}</span>
                            <h3>{project.name}</h3>
                          </div>
                          <span className="homex-project-status">{selectedSlug === project.slug ? "已选" : "查看"}</span>
                        </div>
                        <p>{project.pitch}</p>
                        <div className="homex-project-tags">
                          {project.stack.slice(0, 3).map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    </button>
                  </article>
                </Reveal>
              ))}
            </div>

            {selectedProject && (
              <Reveal className="homex-case-study">
                <div className="homex-case-study-visual">
                  <span className="homex-case-label">SELECTED CASE / {selectedProject.year}</span>
                  {selectedProject.cover ? (
                    <img src={assetUrl(selectedProject.cover)} alt={`${selectedProject.name} 案例预览`} />
                  ) : (
                    <div className="homex-case-fallback">{selectedProject.nameEn}</div>
                  )}
                  <div className="homex-case-stamp">CASE<br />FILE</div>
                </div>
                <div className="homex-case-study-copy">
                  <span className="homex-section-index">{selectedProject.nameEn || "SELECTED PROJECT"}</span>
                  <h3>{selectedProject.name}</h3>
                  <p className="homex-case-problem">{selectedProject.problem || selectedProject.pitch}</p>
                  <div className="homex-case-role">
                    <span>我的角色</span>
                    <p>{selectedProject.role}</p>
                  </div>
                  <div className="homex-case-decisions">
                    {selectedProject.decisions.slice(0, 2).map((decision) => (
                      <div key={decision.title}>
                        <strong>{decision.title}</strong>
                        <span>{decision.detail}</span>
                      </div>
                    ))}
                  </div>
                  <div className="homex-case-actions">
                    <Link className="homex-button homex-button--primary" to={`/project/${selectedProject.slug}`}>
                      打开完整案例
                    </Link>
                    <a className="homex-button homex-button--quiet" href={agentHref()}>
                      让 Agent 解释
                    </a>
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </section>

        <section id="agent" className="homex-agent homex-section">
          <div className="homex-container homex-agent-grid">
            <Reveal className="homex-agent-visual-wrap">
              <div className="homex-agent-visual">
                <div className="homex-agent-visual-halo" />
                <img src={assetUrl("assets/agent-guide-transparent.png")} alt="" />
                <span className="homex-agent-orbit homex-agent-orbit--one" />
                <span className="homex-agent-orbit homex-agent-orbit--two" />
                <div className="homex-agent-note">PUBLIC KNOWLEDGE BASE<br /><strong>可验证的对话</strong></div>
              </div>
            </Reveal>
            <Reveal className="homex-agent-copy">
              <span className="homex-section-index">03 / ASK THE AGENT</span>
              <h2>不只看作品，<em>直接问我。</em></h2>
              <p>
                公开 Agent 连接作品集与项目资料。你可以追问技术取舍、项目贡献和面试讲法，答案会尽量回到具体案例，而不是一段泛泛的自我介绍。
              </p>
              <div className="homex-prompt-panel">
                <span className="homex-prompt-label">试着问</span>
                {AGENT_PROMPTS.map((prompt) => (
                  <button
                    type="button"
                    key={prompt}
                    className={agentPrompt === prompt ? "is-active" : ""}
                    onClick={() => setAgentPrompt(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
                <div className="homex-prompt-preview">
                  <span>你的问题</span>
                  <strong>{agentPrompt}</strong>
                </div>
              </div>
              <a className="homex-button homex-button--primary" href={agentHref()}>
                打开公开 Agent
              </a>
            </Reveal>
          </div>
        </section>

        <section id="career" className="homex-career homex-section">
          <div className="homex-container">
            <Reveal>
              <div className="homex-section-heading homex-section-heading--wide">
                <span className="homex-section-index">04 / CAREER RADAR</span>
                <div className="homex-heading-row">
                  <h2>把机会，也做成一个系统。</h2>
                  <p>作品集负责让别人了解我，求职雷达帮助我持续找到值得投入的下一步。</p>
                </div>
              </div>
            </Reveal>
            <div className="homex-career-grid">
              <Reveal className="homex-radar-stage">
                <div className="homex-radar-aura" />
                <img src={assetUrl("assets/career-radar-transparent.png")} alt="" />
                <span className="homex-radar-chip homex-radar-chip--one">职位来源</span>
                <span className="homex-radar-chip homex-radar-chip--two">匹配理由</span>
                <span className="homex-radar-chip homex-radar-chip--three">投递进度</span>
              </Reveal>
              <Reveal className="homex-career-copy">
                <div className="homex-private-badge"><span /> 私密工作台 · 需要密码</div>
                <h3>从发现岗位，到准备下一次面试。</h3>
                <p>
                  工作台会把职位来源、匹配证据、收藏和投递进度串在一起。真实偏好和岗位资料留在登录后的空间，公开首页只展示这套方法如何帮助求职。
                </p>
                <div className="homex-career-steps">
                  {[
                    ["01", "发现机会", "按方向、技术和工作方式筛选"],
                    ["02", "解释匹配", "把符合项、差距和待确认项拆开"],
                    ["03", "持续跟进", "收藏、准备材料、记录沟通与面试"],
                  ].map(([index, title, detail]) => (
                    <div key={index}>
                      <span>{index}</span>
                      <div><strong>{title}</strong><small>{detail}</small></div>
                    </div>
                  ))}
                </div>
                <a className="homex-button homex-button--primary" href={workspaceHref()}>
                  进入求职工作台
                </a>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="homex-contact homex-section">
          <div className="homex-container homex-contact-inner">
            <Reveal>
              <span className="homex-section-index">05 / NEXT CONVERSATION</span>
              <h2>如果你也在把 AI 放进真实流程，<em>我们可以聊聊。</em></h2>
              <p>
                我正在寻找 AI 应用开发、AI 产品和能把产品推进上线的团队，也欢迎围绕 Agent、知识库和工作流聊一个具体问题。
              </p>
              <div className="homex-contact-actions">
                <Link className="homex-button homex-button--primary" to="/about">查看经历与技能</Link>
                {data.contact.links.slice(0, 2).map((link) => (
                  <a key={link.url} className="homex-button homex-button--quiet" href={link.url} target="_blank" rel="noreferrer noopener">
                    {link.label}
                  </a>
                ))}
              </div>
            </Reveal>
            <Reveal className="homex-contact-signature">
              <span>Yang Liqing</span>
              <strong>AI Engineer<br />&amp; Product Builder</strong>
              <small>重庆 / 杭州 · 2026</small>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="homex-footer">
        <div className="homex-container">
          <span>© {new Date().getFullYear()} {data.identity.name}</span>
          <span>Projects / Agent / Career</span>
          <a href="#top">回到顶部 ↑</a>
        </div>
      </footer>
    </div>
  );
}
