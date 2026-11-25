import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function NewItineraryPage() {
  return (
    <RoutePlaceholder
      title="Create itinerary"
      owner="Habiba Khaled"
      requirements={["ITN-01"]}
      description="Create a private-by-default itinerary with a title, countries from the reference list and a start date."
    />
  );
}
