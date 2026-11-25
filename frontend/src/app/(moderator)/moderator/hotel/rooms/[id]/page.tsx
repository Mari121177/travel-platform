import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function EditRoomPage() {
  return (
    <RoutePlaceholder
      title="Room details"
      owner="Hana"
      requirements={["HTL-05", "HTL-06"]}
      description="Edit the room's beds, occupancy, price and availability, or deactivate/delete it with the required checks."
    />
  );
}
