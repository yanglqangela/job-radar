import type { ReactNode } from "react";
import { clsx } from "../../lib/util";

export function SectionShell({
  id,
  index,
  title,
  titleEn,
  note,
  tone = "paper",
  children,
}: {
  id?: string;
  index: string;
  title: string;
  titleEn?: string;
  note?: string;
  tone?: "paper" | "ink";
  children: ReactNode;
}) {
  return (
    <section id={id} className={clsx("pf-section", tone === "ink" && "pf-section--ink")}>
      <div className="pf-container pf-section-grid">
        <aside className="pf-section-rail" aria-hidden="true">
          <span className="pf-section-index">{index}</span>
          <span className="pf-section-rail-label">{titleEn}</span>
        </aside>

        <div className="pf-section-content">
          <header className="pf-section-head">
            <h2 className="pf-section-title">{title}</h2>
            {note && <p className="pf-section-note">{note}</p>}
          </header>
          {children}
        </div>
      </div>
    </section>
  );
}
