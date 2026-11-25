import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function PublicItineraryDetailPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <RoutePlaceholder
        title="Public itinerary"
        owner="Habiba Khaled"
        requirements={["ITN-21", "ITN-25", "ITN-26"]}
        description="Read a public itinerary with its author, days, activities and budget, and offer clone for registered users."
      />
    </div>
  );
}
