import { useCallback, useEffect, useMemo, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthGate } from "./components/AuthGate";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import {
  AppContext,
  type Session,
  type ToastTone,
} from "./lib/appContext";
import { b64ToBytes, bytesToB64, deriveRawKey, importAesKey } from "./lib/crypto";
import { decryptWithKey, decryptWithPassword, loadEnvelopes, loadMeta } from "./lib/data";
import { removeRaw, storage } from "./lib/storage";
import { clsx } from "./lib/util";
import { AskPage } from "./pages/AskPage";
import { AgentPage } from "./pages/AgentPage";
import { AboutPage } from "./pages/AboutPage";
import { AdminPage } from "./pages/AdminPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { ProjectPage } from "./pages/ProjectPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TodayPage } from "./pages/TodayPage";
import type { Meta } from "./types";

type ToastItem = { id: string; message: string; tone: ToastTone };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = await loadMeta();
      if (!cancelled) setMeta(m);
      const remembered = storage.getRememberedKey();
      if (remembered) {
        try {
          const raw = b64ToBytes(remembered);
          const key = await importAesKey(raw);
          const envelopes = await loadEnvelopes();
          const data = await decryptWithKey(key, envelopes);
          if (!cancelled) setSession({ ...data, key, rawKey: raw });
        } catch {
          removeRaw("key");
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unlock = useCallback(async (password: string, remember: boolean) => {
    const envelopes = await loadEnvelopes();
    if (!envelopes.profile) {
      throw new Error("站点还没有数据：请先运行导出脚本生成 profile.enc.json");
    }
    const raw = await deriveRawKey(password, envelopes.profile.kdf);
    const key = await importAesKey(raw);
    const data = await decryptWithPassword(password, envelopes);
    setSession({ ...data, key, rawKey: raw });
    if (remember) storage.setRememberedKey(bytesToB64(raw));
    else removeRaw("key");
    setMeta(await loadMeta());
  }, []);

  const lock = useCallback(() => {
    setSession(null);
    window.location.hash = "#/";
  }, []);

  const refresh = useCallback(async () => {
    if (!session) throw new Error("尚未解锁");
    const envelopes = await loadEnvelopes();
    let data;
    try {
      data = await decryptWithKey(session.key, envelopes);
    } catch {
      throw new Error("数据已重新加密（密码可能已轮换），请锁定后重新解锁");
    }
    setSession((prev) => (prev ? { ...prev, ...data } : prev));
    setMeta(await loadMeta());
  }, [session]);

  const ctx = useMemo(
    () => ({ session, meta, loading, unlock, lock, refresh, toast }),
    [session, meta, loading, unlock, lock, refresh, toast],
  );

  return (
    <HashRouter>
      <AppContext.Provider value={ctx}>
        <Routes>
          <Route path="/" element={<PortfolioPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/project/:slug" element={<ProjectPage />} />
          <Route path="/agent" element={<AgentPage />} />
          <Route path="/edit" element={<AdminPage />} />
          <Route path="/unlock" element={<AuthGate />} />
          <Route element={<WorkspaceLayout />}>
            <Route path="/today" element={<TodayPage />} />
            <Route path="/ask" element={<AskPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={clsx(
                "pointer-events-auto max-w-sm rounded-xl px-3.5 py-2 text-[13px] shadow-lg",
                t.tone === "error"
                  ? "bg-rose-600 text-white"
                  : t.tone === "success"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 text-white dark:bg-slate-700",
              )}
            >
              {t.message}
            </div>
          ))}
        </div>
      </AppContext.Provider>
    </HashRouter>
  );
}
