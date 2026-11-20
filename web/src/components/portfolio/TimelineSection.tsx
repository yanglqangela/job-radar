import type { PortfolioData } from "../../types.portfolio";
import { SectionShell } from "./SectionShell";

export function TimelineSection({ data }: { data: PortfolioData }) {
  const { timeline } = data;

  return (
    <SectionShell
      id="experience"
      index="02"
      title={timeline.title}
      titleEn={timeline.titleEn}
      note="从算法工程到 AI 产品，两条线都走过；按时间倒序。"
    >
      <ol className="pf-timeline">
        {timeline.items.map((item, index) => {
          const tags = (item.tags || []).filter((tag) => !item.role?.includes(tag));
          const year = item.period?.match(/\d{4}/)?.[0] || "—";
          return (
            <li key={`${item.org}-${item.role}-${item.period}-${index}`} className="pf-entry">
              <div className="pf-entry-date">
                <span className="pf-entry-year">{year}</span>
                <span className="pf-entry-period">{item.period}</span>
                <span className="pf-entry-kind">
                  {item.kind === "work" ? "工作" : "教育"}
                </span>
              </div>

              <div>
                <h3 className="pf-entry-org">{item.org}</h3>
                <p className="pf-entry-role">
                  {item.role}
                  {item.location ? `，${item.location}` : ""}
                </p>

                {item.bullets.length > 0 && (
                  <ul className="pf-bullets">
                    {item.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}

                {tags.length > 0 && <p className="pf-entry-tags">{tags.join("、")}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {timeline.compactItems.length > 0 && (
        <div className="pf-awards">
          <p className="pf-label">奖项与证书</p>
          <div className="pf-award-grid">
            {timeline.compactItems.map((item) => (
              <div key={`${item.kind}-${item.title}`}>
                <p className="pf-award-title">{item.title}</p>
                {item.meta && <p className="pf-award-meta">{item.meta}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionShell>
  );
}
