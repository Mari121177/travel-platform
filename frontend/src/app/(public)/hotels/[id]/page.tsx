import { Suspense } from "react";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { HotelDetailsClient } from "../_components/HotelDetailsClient";

// HTL-02, HTL-15, HTL-24: public hotel details page
export default function HotelDetailsPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      {/* useSearchParams needs a Suspense boundary in Next.js 15 */}
      <Suspense fallback={<FullPageSpinner label="Loading hotel…" />}>
        <HotelDetailsClient />
      </Suspense>
    </div>
  );
}