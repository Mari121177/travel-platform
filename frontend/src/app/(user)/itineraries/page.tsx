import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function ItinerariesPage() {
  return (
    <RoutePlaceholder
      title="My itineraries"
      owner="Habiba Khaled"
      requirements={["ITN-03", "ITN-20", "ITN-28"]}
      description="List my itineraries most recently updated first, with title, countries, start date, days and visibility."
    />
  );
}
