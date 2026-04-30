"use client";

import { useState } from "react";
import {
  formatFocusedCheckIn,
  getDailyCheckInPrompt,
  getDailyCheckInStarters,
  getDailyFocusAreas,
} from "@/lib/dailyCheckIn";

export default function DailyCheckInComposer({
  value,
  posting,
  onChange,
  onSubmit,
}: {
  value: string;
  posting: boolean;
  onChange: (value: string) => void;
  onSubmit: (content: string) => void;
}) {
  const prompt = getDailyCheckInPrompt();
  const starters = getDailyCheckInStarters();
  const focusAreas = getDailyFocusAreas();
  const [focus, setFocus] = useState(focusAreas[0]);

  const applyStarter = (starter: string) => {
    onChange(value.trim() ? `${value.trim()}\n${starter}` : starter);
  };

  return (
    <section id="daily-check-in" className="panel mb-8 scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Daily Check-In</h2>
          <p className="muted mt-1 text-sm">{prompt}</p>
        </div>
        <span className="metric-pill text-xs">Today</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <select
          className="field w-auto min-w-36"
          value={focus}
          onChange={(event) => setFocus(event.target.value)}
          aria-label="Today’s focus"
        >
          {focusAreas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
        {starters.map((starter) => (
          <button
            key={starter.label}
            className="btn-secondary text-xs"
            type="button"
            onClick={() => applyStarter(starter.text)}
          >
            {starter.label}
          </button>
        ))}
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Turn today's progress into a post..."
        className="field h-24 resize-none"
      />
      <button
        onClick={() => onSubmit(formatFocusedCheckIn(focus, value))}
        disabled={posting}
        className="btn-primary mt-3"
      >
        {posting ? "Posting..." : "Post Check-In"}
      </button>
    </section>
  );
}
