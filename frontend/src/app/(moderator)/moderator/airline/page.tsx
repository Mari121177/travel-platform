import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function AirlineDashboardPage() {
  return (
    <RoutePlaceholder
      title="Airline dashboard"
      owner="Malk"
      requirements={["FLT-01", "FLT-03", "FLT-30"]}
      description="Overview of the assigned airline: profile completeness, flights and their status."
    />
  );
}
