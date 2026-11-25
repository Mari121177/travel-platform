import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-10">
          <Spinner size="lg" className="text-brand-600" label="Loading…" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
