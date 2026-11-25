import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function HotelRoomsPage() {
  return (
    <RoutePlaceholder
      title="Rooms"
      owner="Hana"
      requirements={["HTL-03", "HTL-05", "HTL-06"]}
      description="List the hotel's rooms, add a room, edit it, deactivate or delete it."
    />
  );
}
