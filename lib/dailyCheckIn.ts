const dailyPrompts = [
  "What is one visible move you made today?",
  "What felt hard, and what did you do anyway?",
  "What small proof of progress can you share?",
  "What are you learning about yourself right now?",
  "What is one next step you can take before tomorrow?",
  "Where did you show discipline today?",
  "What support, advice, or accountability would help next?",
];

const promptStarters = [
  { label: "Progress", text: "Today I made progress by " },
  { label: "Reflection", text: "One thing I learned today was " },
  { label: "Next Step", text: "The next step I am committing to is " },
];

export const getDailyCheckInPrompt = (date = new Date()) => {
  const dayKey = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const dayIndex = Math.floor(dayKey / 86_400_000);

  return dailyPrompts[dayIndex % dailyPrompts.length];
};

export const getDailyCheckInStarters = () => promptStarters;
