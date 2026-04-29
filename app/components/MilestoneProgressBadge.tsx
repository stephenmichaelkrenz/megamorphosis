export default function MilestoneProgressBadge({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  return (
    <span className="metric-pill">
      <span className="muted">Milestones</span>
      <span className="ml-2 font-semibold">
        {completed}/{total}
      </span>
    </span>
  );
}
