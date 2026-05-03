import Link from "next/link";
import type { TodaySummary } from "@/lib/today";

const formatCount = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const getPrimaryAction = (summary: TodaySummary) => {
  if (summary.unreadMessageCount > 0) {
    return {
      href: "/messages",
      label: "Read Messages",
      note: `${formatCount(summary.unreadMessageCount, "message")} waiting`,
    };
  }

  if (summary.unreadCommentNotificationCount > 0) {
    return {
      href: "/notifications",
      label: "Reply to Comments",
      note: `${formatCount(summary.unreadCommentNotificationCount, "comment")} waiting`,
    };
  }

  if (summary.unreadNotificationCount > 0) {
    return {
      href: "/notifications",
      label: "Review Notifications",
      note: `${formatCount(summary.unreadNotificationCount, "notification")} waiting`,
    };
  }

  if (!summary.hasCheckedInToday) {
    return {
      href: "#daily-check-in",
      label: "Post Check-In",
      note: "Start today's visible progress",
    };
  }

  if (summary.journeyPrompt) {
    return {
      href: `/journey/${summary.journeyPrompt.id}`,
      label: summary.journeyPrompt.isStale ? "Revive Journey" : "Update Journey",
      note: summary.journeyPrompt.title,
    };
  }

  if (summary.recentCircleActivity) {
    return {
      href: `/circles/${summary.recentCircleActivity.slug}`,
      label: "Check Circle",
      note: `${summary.recentCircleActivity.name} is active`,
    };
  }

  if (summary.joinedCircleCount === 0 || summary.followingCount < 3) {
    return {
      href: summary.joinedCircleCount === 0 ? "/circles" : "/discover",
      label: summary.joinedCircleCount === 0 ? "Join a Circle" : "Follow People",
      note: "Build the first layer of your network",
    };
  }

  if (summary.joinedCircleCount > 0) {
    return {
      href: "/circles",
      label: "Check Circles",
      note: `${formatCount(summary.joinedCircleCount, "Circle")} joined`,
    };
  }

  return {
    href: "/discover",
    label: "Find People",
    note: "Follow builders to shape your feed",
  };
};

const getJourneyCopy = (summary: TodaySummary) => {
  if (!summary.journeyPrompt) return "No active Journey needs a nudge.";

  if (!summary.journeyPrompt.isStale) return summary.journeyPrompt.title;

  if (summary.journeyPrompt.daysSinceLastUpdate === null) {
    return `${summary.journeyPrompt.title} needs its first update.`;
  }

  return `${summary.journeyPrompt.title} is ${formatCount(
    summary.journeyPrompt.daysSinceLastUpdate,
    "day",
  )} quiet.`;
};

const getCircleCopy = (summary: TodaySummary) => {
  if (summary.recentCircleActivity) {
    return `${summary.recentCircleActivity.name} has new activity.`;
  }

  if (summary.joinedCircleCount > 0) {
    return `${formatCount(summary.joinedCircleCount, "Circle")} joined.`;
  }

  return "Join a Circle to start this loop.";
};

export default function TodayModule({ summary }: { summary: TodaySummary }) {
  const action = getPrimaryAction(summary);

  return (
    <section className="panel mb-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="muted text-xs font-semibold uppercase">Today</p>
          <h2 className="mt-1 text-xl font-bold">What needs attention</h2>
          <p className="muted mt-2 text-sm">
            A quick read on momentum, connection, and the next best move.
          </p>
        </div>
        <Link href={action.href} className="btn-primary">
          {action.label}
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <span className="metric-pill text-xs">
            {summary.hasCheckedInToday ? "Done" : "Open"}
          </span>
          <h3 className="mt-3 font-semibold">Check-In</h3>
          <p className="muted mt-1 text-sm">
            {summary.hasCheckedInToday
              ? "Today's post is in the feed."
              : "Post one small proof of progress."}
          </p>
        </div>

        <div>
          <span className="metric-pill text-xs">
            {summary.journeyPrompt ? "Ready" : "Clear"}
          </span>
          <h3 className="mt-3 font-semibold">Journey</h3>
          <p className="muted mt-1 text-sm">{getJourneyCopy(summary)}</p>
        </div>

        <div>
          <span className="metric-pill text-xs">
            {summary.recentCircleActivity
              ? `${summary.recentCircleActivity.activityCount} recent`
              : formatCount(summary.circleCheckinStreak, "day")}
          </span>
          <h3 className="mt-3 font-semibold">Circle Streak</h3>
          <p className="muted mt-1 text-sm">{getCircleCopy(summary)}</p>
        </div>

        <div>
          <span className="metric-pill text-xs">
            {summary.unreadNotificationCount + summary.unreadMessageCount}
          </span>
          <h3 className="mt-3 font-semibold">Inbox</h3>
          <p className="muted mt-1 text-sm">{action.note}</p>
        </div>
      </div>
    </section>
  );
}
