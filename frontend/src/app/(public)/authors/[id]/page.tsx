import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function AuthorPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <RoutePlaceholder
        title="Author profile"
        owner="Malk"
        requirements={["BLG-12", "ITN-20"]}
        description="Show the author's name, join date, published posts and public itineraries."
      />
    </div>
  );
}
