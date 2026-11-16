import type { PortfolioProject } from "../../types.portfolio";
import { ProjectMedia } from "./ProjectMedia";

export function ProjectCard({
  project,
  index,
  total,
}: {
  project: PortfolioProject;
  index: number;
  total: number;
}) {
  const number = String(index + 1).padStart(2, "0");
  const totalLabel = String(total).padStart(2, "0");

  return (
    <article
      id={`project-${project.slug}`}
      className="card flex h-full w-full flex-col overflow-hidden"
    >
      <ProjectMedia project={project} />

      <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8">
        <div>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-slate-400">
            <span>
              {number} / {totalLabel}
            </span>
            <span>{project.year}</span>
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {project.name}
          </h3>
          {project.nameEn && (
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {project.nameEn}
            </p>
          )}
          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {project.pitch}
          </p>
        </div>

        {(project.problem || project.role) && (
          <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 dark:border-slate-800">
            {project.problem && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">问题</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {project.problem}
                </p>
              </div>
            )}
            {project.role && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">我的角色</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {project.role}
                </p>
              </div>
            )}
          </div>
        )}

        {project.decisions.length > 0 && (
          <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">关键决策</p>
            <ol className="mt-3 space-y-3">
              {project.decisions.map((decision, decisionIndex) => (
                <li key={decision.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                    {decisionIndex + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{decision.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {decision.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {project.metrics.length > 0 && (
          <dl className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
            {project.metrics.map((metric) => (
              <div key={metric.label}>
                <dt className="text-[10px] leading-tight text-slate-400">{metric.label}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">{metric.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2 dark:border-slate-800">
          {project.highlights.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">结果</p>
              <ul className="mt-2 space-y-1.5">
                {project.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="relative pl-4 text-[13px] leading-relaxed text-slate-600 before:absolute before:left-0 before:top-[0.6em] before:h-1 before:w-1 before:rounded-full before:bg-brand-500 dark:text-slate-300"
                  >
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {project.stack.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">技术栈</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.stack.map((tech) => (
                  <span
                    key={tech}
                    className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {project.links.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-4 border-t border-slate-100 pt-5 dark:border-slate-800">
            {project.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
