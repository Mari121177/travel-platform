import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function EditItineraryPage() {
  return (
    <RoutePlaceholder
      title="Edit itinerary"
      owner="Habiba Khaled"
      requirements={["ITN-01", "ITN-05", "ITN-07", "ITN-08", "ITN-10", "ITN-14", "ITN-16", "ITN-20"]}
      description="Edit the title, countries and start date; add, reorder and delete days; manage activities, budgets, transport costs and visibility."
    />
  );
}
