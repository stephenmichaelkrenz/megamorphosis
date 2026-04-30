export type TodayJourneyPrompt = {
  id: string;
  title: string;
  lastUpdatedAt: string | null;
};

export type TodaySummary = {
  hasCheckedInToday: boolean;
  journeyPrompt: TodayJourneyPrompt | null;
  joinedCircleCount: number;
  circleCheckinStreak: number;
  unreadNotificationCount: number;
  unreadMessageCount: number;
};

export const emptyTodaySummary: TodaySummary = {
  hasCheckedInToday: false,
  journeyPrompt: null,
  joinedCircleCount: 0,
  circleCheckinStreak: 0,
  unreadNotificationCount: 0,
  unreadMessageCount: 0,
};

export const getTodayStartIso = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
};

