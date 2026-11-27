import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FlightsClient } from "./FlightsClient";

export default function FlightsPage() {
  return (
    <div className="container-page space-y-6 py-8 sm:py-10">
      <PageHeader
        title="Find your flight"
        description="Search by route, date and passengers, then filter and sort the results."
      />
      <Suspense fallback={null}>
        <FlightsClient />
      </Suspense>
    </div>
  );
}