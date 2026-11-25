import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function AdminAnalyticsPage() {
  return (
    <RoutePlaceholder
      title="Analytics"
      owner="Ghada"
      requirements={["BON-01", "ACC-17"]}
      description="Show bookings and revenue per provider over a selected period."
    />
  );
}
