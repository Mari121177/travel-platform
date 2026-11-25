import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function FlightBookingDetailsPage() {
  return (
    <RoutePlaceholder
      title="Flight booking details"
      owner="Adala"
      requirements={["FLT-25", "FLT-26", "FLT-23", "PAY-03"]}
      description="Show the full booking, the e-ticket download, the cancellation preview and the cancel action with confirmation."
    />
  );
}
