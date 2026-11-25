import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function PublicItinerariesPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <RoutePlaceholder
        title="Public itineraries"
        owner="Habiba Khaled"
        requirements={["ITN-21", "GEN-05"]}
        description="Search public itineraries by keyword, duration and destination, and open one read-only."
      />
    </div>
  );
}
