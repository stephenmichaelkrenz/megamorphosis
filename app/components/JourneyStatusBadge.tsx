import { JourneyStatus } from "@/types";

const statusLabels: Record<JourneyStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

const statusClasses: Record<JourneyStatus, string> = {
  active: "metric-pill metric-pill-success",
  paused: "metric-pill metric-pill-attention",
  completed: "metric-pill metric-pill-proof",
};

export default function JourneyStatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const safeStatus: JourneyStatus =
    status === "paused" || status === "completed" ? status : "active";

  return (
    <span className={statusClasses[safeStatus]}>
      <span className="muted">Status</span>
      <span className="ml-2 font-semibold">{statusLabels[safeStatus]}</span>
    </span>
  );
}
