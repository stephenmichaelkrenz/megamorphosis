export default function ProBadge({ tier }: { tier?: string | null }) {
  if (tier !== "pro") return null;

  return <span className="metric-pill text-xs">Pro</span>;
}
