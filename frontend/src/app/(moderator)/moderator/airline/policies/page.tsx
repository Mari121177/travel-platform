import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function AirlinePoliciesPage() {
  return (
    <RoutePlaceholder
      title="Airline policies"
      owner="Malk"
      requirements={["FLT-04", "FLT-08", "FLT-09"]}
      description="Manage the baggage allowance, extra-bag rules and cancellation tiers."
    />
  );
}
