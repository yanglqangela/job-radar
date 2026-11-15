import { useState } from "react";
import type { Job } from "../types";
import type { Marks } from "../lib/storage";
import { clsx, copyText, safeHost } from "../lib/util";
import { ScoreBadge } from "./ScoreBadge";
import { SourceChips } from "./SourceChips";

export function JobCard({
  job,
  marks,
  onFavorite,
  onApplied,
  onToast,
}: {
  job: Job;
  marks: Marks;
  onFavorite: (job: Job) => void;
  onApplied: (job: Job) => void;
  onToast: (message: string, tone?: "info" | "success" | "error") => void;
}) {
  const [open, setOpen] = useState(false);
  const favorite = marks.favorites.includes(job.id);
  const applied = Boolean(marks.applied[job.id]);
  const match = job.match;
  const host = safeHost(job.url);

  return (
    <article className={clsx("card p-4 transition", applied && "opacity-75")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate">{job.company || "未知公司"}</span>
            {host && <span className="hidden truncate sm:inline">· {host}</span>}
          </div>
          <h3 className="mt-1 text-[15px] font-semibold leading-snug">{job.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {job.location && <span>{job.location}</span>}
            {job.salary && <span>{job.salary}</span>}
            {job.category && <span className="chip bg-slate-100 dark:bg-slate-800">{job.category}</span>}
          </div>
        </div>
        <ScoreBadge score={match?.score ?? 0} />
      </div>

      {match?.summary && (
        <p className={clsx("mt-2.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300", !open && "line-clamp-2")}>
          {match.summary}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
        <span>{match?.source === "llm" ? "AI 匹配" : "技能匹配"}</span>
        {favorite && <span className="text-rose-500">已收藏</span>}
        {applied && <span className="text-brand-500">已投递</span>}
      </div>

      <div className="mt-2.5">
        <SourceChips matched={match?.matchedSkills} missing={match?.missingSkills} />
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t pt-3 text-[13px] leading-relaxed">
          {job.summary && <p className="text-slate-600 dark:text-slate-300">{job.summary}</p>}
          <Section title="职责" items={job.responsibilities} />
          <Section title="要求" items={job.requirements} />
          <Section title="优势" items={match?.advantages} />
          <Section title="差距" items={match?.gaps} />
          <Section title="建议" items={match?.suggestions} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {job.url && (
          <a className="btn-ghost !px-3 !py-1.5 text-xs" href={job.url} target="_blank" rel="noreferrer">
            看 JD
          </a>
        )}
        {(job.applyUrl || job.url) && (
          <a
            className="btn-primary !px-3 !py-1.5 text-xs"
            href={job.applyUrl || job.url}
            target="_blank"
            rel="noreferrer"
          >
            去投递
          </a>
        )}
        <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => onFavorite(job)}>
          {favorite ? "取消收藏" : "收藏"}
        </button>
        <button
          className={clsx("btn-ghost !px-3 !py-1.5 text-xs", applied && "!border-brand-300 !text-brand-600")}
          onClick={() => onApplied(job)}
        >
          {applied ? "取消已投" : "标记已投"}
        </button>
        <button
          className="btn-ghost !px-3 !py-1.5 text-xs"
          onClick={() =>
            copyText(job.applyUrl || job.url)
              .then(() => onToast("链接已复制", "success"))
              .catch(() => onToast("复制失败", "error"))
          }
        >
          复制链接
        </button>
        <button
          className="btn-ghost !px-3 !py-1.5 text-xs"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "收起" : "详情"}
        </button>
      </div>
    </article>
  );
}

function Section({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</div>
      <ul className="list-disc space-y-1 pl-4 text-slate-600 dark:text-slate-300">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
