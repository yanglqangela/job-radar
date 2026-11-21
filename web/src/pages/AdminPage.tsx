import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SiteHeader } from "../components/portfolio/SiteHeader";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import {
  EDITOR_PASSWORD,
  hasEditorSession,
  setEditorSession,
} from "../lib/editor";
import {
  loadPortfolio,
  loadPortfolioDraft,
  savePortfolioDraft,
  type PortfolioDraft,
} from "../lib/portfolio";
import type { PortfolioData } from "../types.portfolio";

const RADAR_PREFS_KEY = "job-radar-editor-preferences";

type RadarPreferences = {
  keywords: string;
  city: string;
  topN: string;
};

const DEFAULT_RADAR: RadarPreferences = { keywords: "AI 应用开发, AI 产品", city: "重庆, 杭州", topN: "5" };

export function AdminPage() {
  const [authenticated, setAuthenticated] = useState(hasEditorSession);
  const [password, setPassword] = useState("");
  const [data, setData] = useState<PortfolioData | null>(null);
  const [draft, setDraft] = useState<PortfolioDraft | null>(null);
  const [radar, setRadar] = useState<RadarPreferences>(() => {
    try {
      return { ...DEFAULT_RADAR, ...JSON.parse(localStorage.getItem(RADAR_PREFS_KEY) || "{}") };
    } catch {
      return DEFAULT_RADAR;
    }
  });
  const [saved, setSaved] = useState(false);
  useDocumentTitle("编辑入口 · 求职雷达");

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    loadPortfolio().then((portfolio) => {
      if (!active) return;
      setData(portfolio);
      setDraft(loadPortfolioDraft() || (portfolio ? { identity: portfolio.identity, hero: portfolio.hero } : null));
    });
    return () => {
      active = false;
    };
  }, [authenticated]);

  const current = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      identity: { ...data.identity, ...(draft?.identity || {}) },
      hero: { ...data.hero, ...(draft?.hero || {}) },
    };
  }, [data, draft]);

  function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (password !== EDITOR_PASSWORD) return;
    setEditorSession(true);
    setAuthenticated(true);
    setPassword("");
  }

  function updateDraft(next: PortfolioDraft) {
    setDraft((previous) => ({
      ...previous,
      ...next,
      identity: { ...(previous?.identity || {}), ...(next.identity || {}) },
      hero: { ...(previous?.hero || {}), ...(next.hero || {}) },
    }));
    setSaved(false);
  }

  function save() {
    if (!draft) return;
    savePortfolioDraft(draft);
    try {
      localStorage.setItem(RADAR_PREFS_KEY, JSON.stringify(radar));
    } catch {
      // 当前浏览器不允许本地保存时仍保留内存中的编辑结果。
    }
    setSaved(true);
  }

  function exportDraft() {
    if (!draft) return;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "portfolio-draft.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!authenticated) {
    return (
      <div className="pf pf-editor-auth flex min-h-[100dvh] items-center justify-center px-6">
        <form onSubmit={unlock} className="pf-editor-auth-card w-full max-w-md">
          <p className="pf-page-kicker">PRIVATE ENTRY / OWNER ONLY</p>
          <h1 className="pf-page-title mt-3">编辑入口</h1>
          <p className="pf-page-lede mt-4">编辑作品集文案和求职雷达偏好，内容只保存在当前浏览器。</p>
          <input
            className="pf-editor-input mt-7"
            type="password"
            placeholder="输入编辑密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
          />
          <button className="pf-editor-button mt-3" type="submit">进入编辑台</button>
          <Link to="/" className="pf-text-link mt-5 inline-flex text-[13px]">返回首页</Link>
        </form>
      </div>
    );
  }

  if (!current || !draft) {
    return <div className="pf flex min-h-[100dvh] items-center justify-center text-[var(--pf-ink-soft)]">正在读取编辑数据</div>;
  }

  return (
    <div className="pf min-h-[100dvh] overflow-x-clip">
      <SiteHeader identity={current.identity} workspace={current.workspace} />
      <main className="pf-subpage-main">
        <div className="pf-container pf-page-intro">
          <p className="pf-page-kicker">PRIVATE EDITOR</p>
          <h1 className="pf-page-title">个人编辑台</h1>
          <p className="pf-page-lede">修改会先保存在当前浏览器。导出 JSON 后，再同步到 content/portfolio.json 发布。</p>
        </div>

        <section className="pf-editor-grid pf-container">
          <article className="pf-editor-card">
            <div className="pf-editor-card-head">
              <div>
                <p className="pf-page-kicker">PUBLIC HOME</p>
                <h2 className="pf-editor-card-title">首页首屏</h2>
              </div>
              <span className="pf-editor-state">{saved ? "已保存" : "未保存"}</span>
            </div>
            <label className="pf-editor-label">姓名下方的方向</label>
            <input
              className="pf-editor-input"
              value={current.identity.headline || ""}
              onChange={(event) => updateDraft({ identity: { headline: event.target.value } })}
            />
            <label className="pf-editor-label">可用状态</label>
            <input
              className="pf-editor-input"
              value={current.identity.availability || ""}
              onChange={(event) => updateDraft({ identity: { availability: event.target.value } })}
            />
            <label className="pf-editor-label">首屏标题</label>
            <input
              className="pf-editor-input"
              value={current.hero.title || ""}
              onChange={(event) => updateDraft({ hero: { title: event.target.value } })}
            />
            <label className="pf-editor-label">首屏介绍（每行一段）</label>
            <textarea
              className="pf-editor-input pf-editor-textarea"
              value={(current.hero.paragraphs || []).join("\n")}
              onChange={(event) => updateDraft({ hero: { paragraphs: event.target.value.split("\n") } })}
            />
          </article>

          <article className="pf-editor-card">
            <div className="pf-editor-card-head">
              <div>
                <p className="pf-page-kicker">JOB RADAR</p>
                <h2 className="pf-editor-card-title">求职雷达偏好</h2>
              </div>
              <Link to="/unlock" className="pf-text-link text-[13px]">打开工作台</Link>
            </div>
            <label className="pf-editor-label">岗位关键词</label>
            <input className="pf-editor-input" value={radar.keywords} onChange={(event) => setRadar({ ...radar, keywords: event.target.value })} />
            <label className="pf-editor-label">城市</label>
            <input className="pf-editor-input" value={radar.city} onChange={(event) => setRadar({ ...radar, city: event.target.value })} />
            <label className="pf-editor-label">每日岗位上限</label>
            <input className="pf-editor-input" inputMode="numeric" value={radar.topN} onChange={(event) => setRadar({ ...radar, topN: event.target.value })} />
            <p className="pf-editor-help">工作台数据仍使用站点加密文件。HTTPS 工作台入口会继续使用同一站点密码。</p>
            <div className="pf-editor-actions">
              <button type="button" className="pf-editor-button" onClick={save}>保存到本机</button>
              <button type="button" className="pf-editor-button pf-editor-button--ghost" onClick={exportDraft}>导出文案 JSON</button>
            </div>
          </article>
        </section>
      </main>
      <div className="pf-grain" aria-hidden="true" />
    </div>
  );
}
