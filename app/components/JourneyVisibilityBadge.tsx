import { JourneyVisibility } from "@/types";

const visibilityLabels: Record<JourneyVisibility, string> = {
  public: "Public",
  unlisted: "Unlisted",
  private: "Private",
};

export default function JourneyVisibilityBadge({
  visibility,
}: {
  visibility: string | null | undefined;
}) {
  const safeVisibility: JourneyVisibility =
    visibility === "unlisted" || visibility === "private"
      ? visibility
      : "public";

  return (
    <span className="metric-pill">
      <span className="muted">Visibility</span>
      <span className="ml-2 font-semibold">
        {visibilityLabels[safeVisibility]}
      </span>
    </span>
  );
}
