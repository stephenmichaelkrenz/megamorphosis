export default function MilestoneProgressBadge({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const isComplete = total > 0 && completed >= total;

  return (
    <span
      className={
        isComplete
          ? "metric-pill metric-pill-success"
          : "metric-pill metric-pill-proof"
      }
    >
      <span className="muted">Milestones</span>
      <span className="ml-2 font-semibold">
        {completed}/{total}
      </span>
    </span>
  );
}
