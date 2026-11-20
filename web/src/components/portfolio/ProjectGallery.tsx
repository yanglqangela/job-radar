import { assetUrl } from "../../lib/portfolio";
import type { PortfolioProject } from "../../types.portfolio";

export function ProjectGallery({ project }: { project: PortfolioProject }) {
  if (!project.screenshots.length) return null;

  return (
    <div className="pf-gallery">
      {project.screenshots.map((shot, index) => (
        <figure
          key={`${shot.src}-${index}`}
          className={index === 0 ? "pf-gallery-item pf-gallery-item--wide" : "pf-gallery-item"}
        >
          <a
            href={assetUrl(shot.src)}
            target="_blank"
            rel="noreferrer noopener"
            title="打开原图"
          >
            <img
              src={assetUrl(shot.src)}
              alt={shot.alt || project.name}
              loading="lazy"
              decoding="async"
            />
          </a>
          {shot.caption && <figcaption>{shot.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
