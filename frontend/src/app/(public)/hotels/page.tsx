import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { HotelSearchClient } from "./_components/HotelSearchClient";

// HTL-11, HTL-12: public hotel search
export default function HotelsPage() {
  return (
    <div className="container-page space-y-6 py-8 sm:py-10">
      <PageHeader
        title="Find a hotel"
        description="Choose a city or country and your dates to see hotels with free rooms for the whole stay."
      />
      {/* useSearchParams needs a Suspense boundary in Next.js 15 */}
      <Suspense fallback={<FullPageSpinner label="Loading search…" />}>
        <HotelSearchClient />
      </Suspense>
    </div>
  );
}