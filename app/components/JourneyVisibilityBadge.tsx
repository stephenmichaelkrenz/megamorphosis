import { JourneyVisibility } from "@/types";

const visibilityLabels: Record<JourneyVisibility, string> = {
  public: "Public",
  unlisted: "Unlisted",
  private: "Private",
};

const visibilityClasses: Record<JourneyVisibility, string> = {
  public: "metric-pill metric-pill-connection",
  unlisted: "metric-pill metric-pill-attention",
  private: "metric-pill metric-pill-proof",
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
    <span className={visibilityClasses[safeVisibility]}>
      <span className="muted">Visibility</span>
      <span className="ml-2 font-semibold">
        {visibilityLabels[safeVisibility]}
      </span>
    </span>
  );
}
