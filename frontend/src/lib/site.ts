export const siteConfig = {
  name: "Voyara",
  description:
    "Search flights and hotels, plan day-by-day itineraries, and share your travels.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
} as const;
