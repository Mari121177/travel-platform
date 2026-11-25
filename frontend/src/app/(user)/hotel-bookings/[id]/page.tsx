import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function HotelBookingDetailsPage() {
  return (
    <RoutePlaceholder
      title="Hotel reservation details"
      owner="Maya"
      requirements={["HTL-20", "HTL-21", "PAY-03", "HTL-23"]}
      description="Show the full reservation, cancellation quote and cancel action, plus the review action for completed stays."
    />
  );
}
