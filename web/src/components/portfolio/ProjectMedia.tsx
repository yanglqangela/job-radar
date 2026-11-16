import { useState } from "react";
import { assetUrl } from "../../lib/portfolio";
import type { PortfolioProject } from "../../types.portfolio";

export function ProjectMedia({ project }: { project: PortfolioProject }) {
  const [failed, setFailed] = useState(false);
  const shot = !failed ? project.screenshots[0] : undefined;

  if (shot) {
    return (
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-900">
        <img
          src={assetUrl(shot.src)}
          alt={shot.alt || project.name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
        {(shot.caption || project.screenshots.length > 1) && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-950/70 to-transparent px-4 pb-3 pt-8 text-[11px] text-white/85">
            <span>{shot.caption}</span>
            {project.screenshots.length > 1 && (
              <span className="rounded-full bg-white/15 px-2 py-0.5">
                1 / {project.screenshots.length}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex aspect-[16/10] flex-col justify-between overflow-hidden bg-slate-950 p-6 text-white sm:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), radial-gradient(70% 80% at 85% 10%, rgba(26,110,245,0.55), transparent 65%)",
          backgroundSize: "18px 18px, 100% 100%",
        }}
      />
      <div className="relative flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/50">
        <span>{project.year || "Project"}</span>
        <span>{project.nameEn || project.slug}</span>
      </div>
      <div className="relative">
        <p className="text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {project.name}
        </p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-white/65 sm:text-sm">
          {project.pitch}
        </p>
      </div>
      <div className="relative flex flex-wrap gap-1.5">
        {project.stack.slice(0, 4).map((tech) => (
          <span
            key={tech}
            className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/70"
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
}
