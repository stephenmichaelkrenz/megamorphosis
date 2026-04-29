const toDateKey = (value: string | null | undefined) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

export const calculateDailyStreak = (values: (string | null | undefined)[]) => {
  const dates = new Set(values.map(toDateKey).filter(Boolean) as string[]);
  if (dates.size === 0) return 0;

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterdayKey = addDays(today, -1).toISOString().slice(0, 10);
  let cursor = dates.has(todayKey)
    ? today
    : dates.has(yesterdayKey)
      ? addDays(today, -1)
      : null;

  if (!cursor) return 0;

  let streak = 0;

  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
};

export const achievementLabels = ({
  journeyStreak,
  circleCheckinStreak,
  completedMilestones,
  updateCount,
}: {
  journeyStreak: number;
  circleCheckinStreak: number;
  completedMilestones: number;
  updateCount: number;
}) => {
  const labels: string[] = [];

  if (updateCount >= 1) labels.push("First Proof");
  if (updateCount >= 5) labels.push("Consistent Builder");
  if (journeyStreak >= 3) labels.push("3-Day Journey Streak");
  if (journeyStreak >= 7) labels.push("7-Day Journey Streak");
  if (completedMilestones >= 1) labels.push("Milestone Finisher");
  if (completedMilestones >= 5) labels.push("Milestone Machine");
  if (circleCheckinStreak >= 3) labels.push("Circle Regular");

  return labels;
};
