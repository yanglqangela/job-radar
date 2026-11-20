import { Link } from "react-router-dom";
import type { PortfolioData, PortfolioProject } from "../../types.portfolio";
import { assetUrl } from "../../lib/portfolio";
import { ProjectDiagram } from "./ProjectDiagram";
import { SectionShell } from "./SectionShell";

function WorkCard({ project, index }: { project: PortfolioProject; index: number }) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <Link
      id={`project-${project.slug}`}
      to={`/project/${project.slug}`}
      className="pf-work-row pf-cosmic-project-card"
    >
      <div className="pf-work-plate pf-cosmic-project-media">
        {project.cover ? (
          <img
            className="pf-project-cover"
            src={assetUrl(project.cover)}
            alt={`${project.name} 项目封面`}
            loading={index > 1 ? "lazy" : "eager"}
          />
        ) : (
          <ProjectDiagram slug={project.slug} caption={false} />
        )}
        <span className="pf-project-number">{number}</span>
        <span className="pf-project-open">OPEN PROJECT ↗</span>
      </div>

      <div className="pf-work-copy pf-cosmic-project-copy">
        <div className="pf-project-card-heading">
          <div>
            <p className="pf-project-kicker">{project.nameEn || "Selected project"}</p>
            <h3 className="pf-serif pf-work-name">{project.name}</h3>
          </div>
          {project.year && <span className="pf-project-year">{project.year}</span>}
        </div>
        <p className="pf-work-pitch">{project.pitch}</p>
        {project.metrics.length > 0 && (
          <div className="pf-project-metrics">
            {project.metrics.slice(0, 2).map((metric) => (
              <span key={metric.label}>
                <strong>{metric.value}</strong> {metric.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function ProjectDeck({ data }: { data: PortfolioData }) {
  return (
    <SectionShell
      id="projects"
      index="01"
      title="项目展厅"
      titleEn="PROJECTS"
      note="每个入口都通向一份完整案例，包含背景、技术决策、界面截图和结果。"
      tone="ink"
    >
      <div className="pf-work pf-cosmic-project-grid">
        {data.projects.map((project, index) => (
          <WorkCard key={project.slug} project={project} index={index} />
        ))}
      </div>
    </SectionShell>
  );
}
