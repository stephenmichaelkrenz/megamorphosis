export type TodayJourneyPrompt = {
  id: string;
  title: string;
  lastUpdatedAt: string | null;
  daysSinceLastUpdate: number | null;
  isStale: boolean;
};

export type TodayCircleActivity = {
  name: string;
  slug: string;
  activityCount: number;
};

export type TodaySummary = {
  hasCheckedInToday: boolean;
  journeyPrompt: TodayJourneyPrompt | null;
  joinedCircleCount: number;
  followingCount: number;
  circleCheckinStreak: number;
  recentCircleActivity: TodayCircleActivity | null;
  unreadNotificationCount: number;
  unreadCommentNotificationCount: number;
  unreadMessageCount: number;
};

export const emptyTodaySummary: TodaySummary = {
  hasCheckedInToday: false,
  journeyPrompt: null,
  joinedCircleCount: 0,
  followingCount: 0,
  circleCheckinStreak: 0,
  recentCircleActivity: null,
  unreadNotificationCount: 0,
  unreadCommentNotificationCount: 0,
  unreadMessageCount: 0,
};

export const getTodayStartIso = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
};

export const getRecentActivityStartIso = () => {
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return start.toISOString();
};

export const getDaysSince = (value: string | null) => {
  if (!value) return null;

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;

  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
};

export const isJourneyStale = (lastUpdatedAt: string | null) => {
  const daysSinceLastUpdate = getDaysSince(lastUpdatedAt);
  return daysSinceLastUpdate === null || daysSinceLastUpdate >= 3;
};
