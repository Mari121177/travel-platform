import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function FlightsPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <RoutePlaceholder
        title="Flight search"
        owner="Ghada"
        requirements={["FLT-11", "FLT-12", "FLT-15", "GEN-05", "GEN-16"]}
        description="Search flights by route, date and passengers, then filter, sort and paginate the results."
      />
    </div>
  );
}
