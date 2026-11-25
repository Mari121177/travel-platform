import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-10">
          <Spinner size="lg" className="text-brand-600" label="Loading…" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
