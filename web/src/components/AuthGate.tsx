import { useState } from "react";
import { useApp } from "../lib/appContext";
import { relativeTime } from "../lib/util";

export function AuthGate() {
  const { unlock, meta, loading } = useApp();
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError("");
    try {
      await unlock(password, remember);
    } catch (err) {
      setError((err as Error).message || "解锁失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-app flex-col justify-center px-6 pb-16">
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
          <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M8 22l8-13 8 13" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="25" r="1.8" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">求职雷达</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">岗位日报 · 项目问答 · 每日企业微信推送</p>
      </div>

      {meta && (
        <div className="card mb-6 px-4 py-3 text-[13px] text-slate-600 dark:text-slate-300">
          <div className="flex items-center justify-between">
            <span>上次更新：{relativeTime(meta.lastRunAt) || "—"}</span>
            <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              新增 {meta.newJobs} 条
            </span>
          </div>
          {meta.status !== "ok" && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              最近一次抓取为降级模式（{meta.degradedReasons.join("、") || "部分数据缺失"}）
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          placeholder="输入站点密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <label className="flex items-center gap-2 px-1 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          记住本机（只保存派生密钥，不保存密码）
        </label>
        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        )}
        <button className="btn-primary w-full py-3" disabled={busy || loading || !password}>
          {busy || loading ? "解锁中…" : "解锁"}
        </button>
      </form>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
        简历与知识库以密文存放在公开仓库，密码仅在本地推导密钥，不会上传。
      </p>
    </div>
  );
}
