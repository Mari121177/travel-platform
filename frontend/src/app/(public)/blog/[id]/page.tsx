import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function BlogPostPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <RoutePlaceholder
        title="Blog post"
        owner="Malk"
        requirements={["BLG-02", "BLG-05", "BLG-06", "BLG-10"]}
        description="Render a published post with its author, tags, images, likes and comments. Guests are sent to login for actions."
      />
    </div>
  );
}
