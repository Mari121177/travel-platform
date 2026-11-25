"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getErrorMessages } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/AuthProvider";
import { validateEmail } from "@/lib/validation";

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const registered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const registerHref = next
    ? `/register?next=${encodeURIComponent(next)}`
    : "/register";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: FieldErrors = {
      email: validateEmail(email) ?? undefined,
      password: password.trim().length === 0 ? "Password is required" : undefined,
    };
    setFieldErrors(errors);
    setFormErrors([]);
    if (errors.email || errors.password) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      setFormErrors(getErrorMessages(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">
          Log in to continue planning your trip.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {registered && (
          <Alert variant="success" title="Account created">
            Your account is ready. Log in to continue.
          </Alert>
        )}
        {next && !registered && (
          <Alert variant="info">
            Please log in to continue to the page you requested.
          </Alert>
        )}
        {formErrors.length > 0 && (
          <Alert variant="error" title="Could not log in">
            <ul className="list-disc space-y-1 pl-4">
              {formErrors.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </Alert>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setFieldErrors((current) => ({ ...current, email: undefined }));
          }}
          error={fieldErrors.email}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
          error={fieldErrors.password}
          required
        />
        <Button type="submit" fullWidth loading={submitting} size="lg">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New to the platform?{" "}
        <Link
          href={registerHref}
          className="font-semibold text-brand-700 transition hover:text-brand-800"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
