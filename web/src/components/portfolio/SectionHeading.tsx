import { clsx } from "../../lib/util";

export function SectionHeading({
  index,
  title,
  titleEn,
  description,
  className,
}: {
  index: string;
  title: string;
  titleEn?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mb-10 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        <p className="portfolio-eyebrow">
          {index} <span className="text-slate-300 dark:text-slate-600">/</span>{" "}
          {titleEn || "Section"}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      </div>
      {description && (
        <p className="max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}
