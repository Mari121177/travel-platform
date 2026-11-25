import type { Metadata } from "next";
import { Suspense } from "react";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { ProfileClient } from "./ProfileClient";

export const metadata: Metadata = {
  title: "My profile",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<FullPageSpinner label="Loading your profile…" />}>
      <ProfileClient />
    </Suspense>
  );
}
