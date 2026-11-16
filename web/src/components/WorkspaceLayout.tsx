import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useApp } from "../lib/appContext";
import { TabBar } from "./TabBar";

const TITLES: Record<string, string> = {
  "/today": "今日岗位 · 求职雷达",
  "/ask": "问一问 · 求职雷达",
  "/settings": "设置 · 求职雷达",
};

export function WorkspaceLayout() {
  const { session, loading, lock } = useApp();
  const location = useLocation();
  useDocumentTitle(TITLES[location.pathname] ?? "求职雷达");

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/unlock"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] pb-24">
      <header className="sticky top-0 z-20 border-b bg-slate-50/90 backdrop-blur dark:bg-slate-950/90">
        <div className="mx-auto flex h-12 max-w-app items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-white">
              <svg
                viewBox="0 0 32 32"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M8 22l8-13 8 13" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold tracking-tight">求职雷达</span>
          </div>
          <button
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
            onClick={lock}
          >
            锁定
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-app">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
