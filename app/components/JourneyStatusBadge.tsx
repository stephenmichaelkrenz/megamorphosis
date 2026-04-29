import { JourneyStatus } from "@/types";

const statusLabels: Record<JourneyStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

export default function JourneyStatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const safeStatus: JourneyStatus =
    status === "paused" || status === "completed" ? status : "active";

  return (
    <span className="metric-pill">
      <span className="muted">Status</span>
      <span className="ml-2 font-semibold">{statusLabels[safeStatus]}</span>
    </span>
  );
}
