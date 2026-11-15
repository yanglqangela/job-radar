import { clsx, scoreTone } from "../lib/util";

export function ScoreBadge({ score, label }: { score: number; label?: string }) {
  return (
    <span className={clsx("chip text-[12px] font-semibold", scoreTone(score))}>
      {label ? `${label} ` : ""}
      {score} 分
    </span>
  );
}
