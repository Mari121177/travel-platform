import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function BlogTagPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <RoutePlaceholder
        title="Posts by tag"
        owner="Malk"
        requirements={["BLG-08", "BLG-09"]}
        description="List the published posts carrying one tag."
      />
    </div>
  );
}
