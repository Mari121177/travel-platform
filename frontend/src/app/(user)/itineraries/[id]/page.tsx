import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function ItineraryDetailsPage() {
  return (
    <RoutePlaceholder
      title="Itinerary details"
      owner="Habiba Khaled"
      requirements={["ITN-03", "ITN-05", "ITN-09", "ITN-14", "ITN-18"]}
      description="Show the full itinerary: ordered days grouped by city, activities, budget breakdown, transport costs and converted totals."
    />
  );
}
