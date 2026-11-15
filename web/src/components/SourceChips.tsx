export function SourceChips({
  matched,
  missing,
  max = 4,
}: {
  matched?: string[];
  missing?: string[];
  max?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(matched || []).slice(0, max).map((s) => (
        <span
          key={`m-${s}`}
          className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        >
          ✓ {s}
        </span>
      ))}
      {(missing || []).slice(0, max).map((s) => (
        <span
          key={`x-${s}`}
          className="chip bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        >
          缺 {s}
        </span>
      ))}
    </div>
  );
}
