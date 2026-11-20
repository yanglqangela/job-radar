import type { PortfolioData } from "../../types.portfolio";
import { SectionShell } from "./SectionShell";

export function SkillsSection({ data, reduced }: { data: PortfolioData; reduced: boolean }) {
  const { skills } = data;
  const projectNames = new Map(data.projects.map((project) => [project.slug, project.name]));

  function jumpToProject(slug: string) {
    document.getElementById(`project-${slug}`)?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <SectionShell
      id="skills"
      index="03"
      title={skills.title}
      titleEn={skills.titleEn}
      note="带下划线的技能能直接跳到对应项目，看它在真实场景里怎么用。"
    >
      <div className="pf-skills">
        {skills.groups.map((group) => (
          <div key={group.name} className="pf-skill-row">
            <h3 className="pf-skill-group">
              {group.name}
              {group.nameEn && <span className="pf-skill-group-en">{group.nameEn}</span>}
            </h3>

            <div className="pf-skill-items">
              {group.items.map((item) =>
                item.evidence ? (
                  <button
                    key={item.name}
                    type="button"
                    className="pf-skill-link"
                    onClick={() => jumpToProject(item.evidence || "")}
                    title={
                      projectNames.has(item.evidence)
                        ? `跳到 ${projectNames.get(item.evidence)}`
                        : "跳到对应项目"
                    }
                  >
                    {item.name}
                  </button>
                ) : (
                  <span key={item.name}>{item.name}</span>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
