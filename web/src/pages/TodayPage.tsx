import { useMemo, useState } from "react";
import { JobCard } from "../components/JobCard";
import { useApp } from "../lib/appContext";
import { storage, type Marks } from "../lib/storage";
import { clsx, formatDate, relativeTime } from "../lib/util";
import type { Job } from "../types";

type Filter = "all" | "favorite" | "applied";

export function TodayPage() {
  const { session, meta, refresh, toast } = useApp();
  const [marks, setMarks] = useState<Marks>(() => storage.getMarks());
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const jobs = session?.digest.jobs ?? [];
  const runDate = session?.digest.runDate ?? "";
  const todayCount = jobs.filter((j) => j.date === runDate).length;

  const filtered = useMemo(() => {
    let list = jobs;
    if (filter === "favorite") list = list.filter((j) => marks.favorites.includes(j.id));
    if (filter === "applied") list = list.filter((j) => Boolean(marks.applied[j.id]));
    return [...list].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.match?.score ?? 0) - (a.match?.score ?? 0);
    });
  }, [jobs, filter, marks]);

  const groups = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of filtered) {
      const key = job.date || "未分组";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }
    return [...map.entries()];
  }, [filtered]);

  function toggleFavorite(job: Job) {
    setMarks((prev) => {
      const has = prev.favorites.includes(job.id);
      const next: Marks = {
        ...prev,
        favorites: has ? prev.favorites.filter((id) => id !== job.id) : [...prev.favorites, job.id],
      };
      storage.saveMarks(next);
      return next;
    });
  }

  function toggleApplied(job: Job) {
    setMarks((prev) => {
      const applied = { ...prev.applied };
      if (applied[job.id]) {
        delete applied[job.id];
      } else {
        applied[job.id] = {
          at: new Date().toISOString(),
          title: job.title,
          company: job.company,
          url: job.applyUrl || job.url,
        };
      }
      const next: Marks = { ...prev, applied };
      storage.saveMarks(next);
      return next;
    });
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
      toast("已同步最新数据", "success");
    } catch (err) {
      toast((err as Error).message || "刷新失败", "error");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-4 px-4 pb-6 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">今日推荐</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {meta?.lastRunAt ? `更新于 ${relativeTime(meta.lastRunAt)}` : "尚未同步"}
            {runDate && ` · ${runDate}`}
          </p>
        </div>
        <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? "同步中…" : "刷新"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="今日新增" value={todayCount} />
        <Stat label="库中岗位" value={jobs.length} />
        <Stat label="已投递" value={Object.keys(marks.applied).length} />
      </div>

      {session?.digest.run.status !== "ok" && session?.digest.run.status !== undefined && (
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          最近一次抓取为降级模式：
          {session.digest.run.degradedReasons?.join("、") || "部分数据缺失"}
        </div>
      )}

      <div className="flex rounded-xl bg-slate-100 p-1 text-xs dark:bg-slate-800">
        {(
          [
            ["all", "全部"],
            ["favorite", "收藏"],
            ["applied", "已投"],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={clsx(
              "flex-1 rounded-lg py-1.5 font-medium transition",
              filter === key
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500 dark:text-slate-400",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="card px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {jobs.length === 0 ? (
            <>
              <p className="font-medium text-slate-700 dark:text-slate-200">还没有岗位数据</p>
              <p className="mt-1">在 GitHub Actions 里手动运行一次 daily 工作流即可生成。</p>
            </>
          ) : (
            <p>这个筛选下还没有岗位</p>
          )}
        </div>
      ) : (
        groups.map(([date, items]) => (
          <section key={date} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {formatDate(date)}
              </h2>
              <span className="text-[11px] text-slate-400">{items.length} 条</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
            {items.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                marks={marks}
                onFavorite={toggleFavorite}
                onApplied={toggleApplied}
                onToast={toast}
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card px-3 py-2.5 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
