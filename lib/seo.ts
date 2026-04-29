export const siteName = "Megamorphosis";

export const truncateDescription = (value: string | null | undefined) => {
  const text = value?.replace(/\s+/g, " ").trim();

  if (!text) return null;
  if (text.length <= 155) return text;

  return `${text.slice(0, 152).trimEnd()}...`;
};

export const publicDescription =
  "Track transformation journeys, share proof of progress, and build momentum with people changing in public.";
