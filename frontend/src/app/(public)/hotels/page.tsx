import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function HotelsPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <RoutePlaceholder
        title="Hotel search"
        owner="Hana"
        requirements={["HTL-11", "HTL-12", "GEN-05", "GEN-16"]}
        description="Search hotels by city or country, dates, guests and rooms, then filter and sort the results."
      />
    </div>
  );
}
