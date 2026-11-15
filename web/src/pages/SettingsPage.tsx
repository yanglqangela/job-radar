import { useState } from "react";
import { bytesToB64 } from "../lib/crypto";
import { useApp } from "../lib/appContext";
import { testConnection } from "../lib/deepseek";
import { removeRaw, storage, type Settings } from "../lib/storage";
import { relativeTime } from "../lib/util";

const MODELS = ["deepseek-chat", "deepseek-reasoner"];

export function SettingsPage() {
  const { session, meta, lock, toast } = useApp();
  const [settings, setSettings] = useState<Settings>(() => storage.getSettings());
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [remembered, setRemembered] = useState(() => Boolean(storage.getRememberedKey()));

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    storage.saveSettings({ ...settings, llmBaseUrl: settings.llmBaseUrl.trim() || "https://api.deepseek.com" });
    toast("设置已保存到本机", "success");
  }

  async function handleTest() {
    if (!settings.llmApiKey.trim()) {
      toast("请先填写 API Key", "error");
      return;
    }
    setTesting(true);
    try {
      await testConnection(settings.llmBaseUrl, settings.llmApiKey.trim(), settings.llmModel);
      toast("连接成功", "success");
    } catch (err) {
      toast((err as Error).message || "连接失败", "error");
    } finally {
      setTesting(false);
    }
  }

  function rememberThisDevice() {
    if (!session) return;
    storage.setRememberedKey(bytesToB64(session.rawKey));
    setRemembered(true);
    toast("已记住本机，下次无需输入密码", "success");
  }

  function forgetThisDevice() {
    removeRaw("key");
    setRemembered(false);
    toast("已取消本机记忆", "success");
  }

  function exportMarks() {
    if (!session) return;
    const payload = { exportedAt: new Date().toISOString(), marks: storage.getMarks() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "job-radar-marks.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    if (!window.confirm("清除本机全部数据（设置/收藏/对话/记住的密钥）？此操作不可撤销。")) return;
    storage.clearAll();
    lock();
    window.location.hash = "#/today";
  }

  const counts = session?.digest.run.counts;

  return (
    <div className="space-y-4 px-4 pb-6 pt-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">设置</h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          API Key 与偏好只保存在本机浏览器
        </p>
      </div>

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">模型</h2>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Base URL</span>
          <input
            className="input"
            value={settings.llmBaseUrl}
            onChange={(e) => update("llmBaseUrl", e.target.value)}
            placeholder="https://api.deepseek.com"
            inputMode="url"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">模型</span>
          <input
            className="input"
            list="model-options"
            value={settings.llmModel}
            onChange={(e) => update("llmModel", e.target.value)}
            placeholder="deepseek-chat"
          />
          <datalist id="model-options">
            {MODELS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">API Key</span>
          <div className="flex gap-2">
            <input
              className="input"
              type={showKey ? "text" : "password"}
              value={settings.llmApiKey}
              onChange={(e) => update("llmApiKey", e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
            />
            <button className="btn-ghost shrink-0 text-xs" onClick={() => setShowKey((v) => !v)}>
              {showKey ? "隐藏" : "显示"}
            </button>
          </div>
        </label>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={save}>
            保存设置
          </button>
          <button className="btn-ghost" onClick={handleTest} disabled={testing}>
            {testing ? "测试中…" : "测试连接"}
          </button>
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-semibold">本机访问</h2>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-slate-600 dark:text-slate-300">记住本机（免密打开）</span>
          <span className="text-slate-400">{remembered ? "已开启" : "未开启"}</span>
        </div>
        <div className="flex gap-2">
          {remembered ? (
            <button className="btn-ghost flex-1 text-xs" onClick={forgetThisDevice}>
              取消记住
            </button>
          ) : (
            <button className="btn-ghost flex-1 text-xs" onClick={rememberThisDevice}>
              在本机记住登录
            </button>
          )}
          <button className="btn-ghost text-xs" onClick={lock}>
            立即锁定
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          「记住本机」保存的是推导出的密钥（不是密码）到浏览器 localStorage，换取免密打开的便利；
          公用设备请勿开启。
        </p>
      </section>

      <section className="card space-y-2 p-4 text-[13px]">
        <h2 className="text-sm font-semibold">数据状态</h2>
        <Row label="上次更新" value={meta?.lastRunAt ? relativeTime(meta.lastRunAt) : "—"} />
        <Row label="生成时间" value={session?.digest.generatedAt ? relativeTime(session.digest.generatedAt) : "—"} />
        <Row label="运行状态" value={session?.digest.run.status === "ok" ? "正常" : "降级/失败"} />
        {counts && (
          <Row
            label="本次统计"
            value={`搜索 ${counts.searched} / 候选 ${counts.newCandidates} / 匹配 ${counts.matched} / 推送 ${counts.pushed}`}
          />
        )}
        <Row label="库中岗位" value={String(session?.digest.jobs.length ?? 0)} />
        <div className="flex gap-2 pt-1">
          <button className="btn-ghost flex-1 text-xs" onClick={exportMarks}>
            导出收藏/已投
          </button>
          <button className="btn-ghost text-xs !text-rose-600" onClick={clearAll}>
            清除本机数据
          </button>
        </div>
      </section>

      <section className="px-1 text-[11px] leading-relaxed text-slate-400">
        <p>· 简历与知识库以 AES-GCM 密文存放在公开仓库，密码不会上传。</p>
        <p>· 问答请求由浏览器直接发往你配置的模型服务，不经过任何中转。</p>
        <p>· 页面不加载第三方脚本、字体或统计。</p>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}
