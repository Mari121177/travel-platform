import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function AirlineProfilePage() {
  return (
    <RoutePlaceholder
      title="Airline profile"
      owner="Malk"
      requirements={["FLT-01", "GEN-08"]}
      description="Edit the airline name, code and logo."
    />
  );
}
