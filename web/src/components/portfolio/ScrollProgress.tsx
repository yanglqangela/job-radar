import { useScrollProgress } from "../../hooks/useScrollProgress";

export function ScrollProgress() {
  const progress = useScrollProgress();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
      <div
        className="h-full origin-left bg-brand-600 transition-[width] duration-150 ease-out dark:bg-brand-400"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </div>
  );
}
