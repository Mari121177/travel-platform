import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function HotelProfilePage() {
  return (
    <RoutePlaceholder
      title="Hotel profile"
      owner="Hana"
      requirements={["HTL-01", "HTL-09", "HTL-10", "GEN-08"]}
      description="Edit the hotel profile, photos, amenities, check-in/out times and cancellation tiers."
    />
  );
}
