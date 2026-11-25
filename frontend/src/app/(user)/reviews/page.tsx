import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function ReviewsPage() {
  return (
    <RoutePlaceholder
      title="My reviews"
      owner="Maya"
      requirements={["HTL-23"]}
      description="Create, edit and delete a review for a completed hotel stay. One rating and optional review per reservation."
    />
  );
}
