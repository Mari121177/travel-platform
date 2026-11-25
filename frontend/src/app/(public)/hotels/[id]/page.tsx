import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function HotelDetailsPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <RoutePlaceholder
        title="Hotel details"
        owner="Hana"
        requirements={["HTL-02", "HTL-15", "HTL-24", "GEN-08"]}
        description="Show the hotel profile, photos, amenities, policies, rating and reviews, plus rooms available for the searched dates."
      />
    </div>
  );
}
