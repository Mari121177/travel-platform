import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function NewRoomPage() {
  return (
    <RoutePlaceholder
      title="Create room"
      owner="Hana"
      requirements={["HTL-03"]}
      description="Add an individually bookable room with a unique name, type, beds, occupancy and price per night."
    />
  );
}
