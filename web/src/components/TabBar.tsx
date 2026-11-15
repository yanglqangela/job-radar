import { NavLink } from "react-router-dom";
import { clsx } from "../lib/util";

function Icon({ name }: { name: "today" | "ask" | "settings" }) {
  if (name === "today") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="5" width="17" height="15" rx="3" />
        <path d="M8 3v4M16 3v4M3.5 10h17" strokeLinecap="round" />
        <path d="M8 14h3M8 17h6" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "ask") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 12a8 8 0 1 1-3.2-6.4" strokeLinecap="round" />
        <path d="M8.5 9.5a3.5 3.5 0 1 1 5 3.2c-.8.4-1.5 1-1.5 2" strokeLinecap="round" />
        <circle cx="12" cy="18" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.1.6.6 1.05 1.2 1.05H21a2 2 0 1 1 0 4h-.09c-.6 0-1.1.45-1.2 1.05z" />
    </svg>
  );
}

const ITEMS = [
  { to: "/today", label: "今日", name: "today" as const },
  { to: "/ask", label: "问一问", name: "ask" as const },
  { to: "/settings", label: "设置", name: "settings" as const },
];

export function TabBar() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 backdrop-blur dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-app items-stretch">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition",
                isActive
                  ? "text-brand-600 dark:text-brand-300"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200",
              )
            }
          >
            <Icon name={item.name} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
