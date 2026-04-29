import { Journey } from "@/types";

export default function FeedCard({ journey }: { journey: Journey }) {
  return (
    <div className="panel">
      <p className="font-semibold">{journey.title}</p>
      <p className="muted text-sm">{journey.category}</p>
      <p className="mt-2 text-sm">{journey.goal_text}</p>
    </div>
  );
}
