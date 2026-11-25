import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function BlogPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <RoutePlaceholder
        title="Travel stories"
        owner="Malk"
        requirements={["BLG-02", "BLG-09", "GEN-05"]}
        description="Browse published posts, search by keyword, filter by tag and paginate the list."
      />
    </div>
  );
}
