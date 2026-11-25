"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api/client";
import { getErrorMessages } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  PASSWORD_MESSAGE,
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/validation";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  consent?: string;
}

export function RegisterForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loginHref = next
    ? `/login?next=${encodeURIComponent(next)}`
    : "/login";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: FieldErrors = {
      name: validateName(name) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirmPassword:
        confirmPassword !== password ? "Passwords do not match" : undefined,
      consent: consent
        ? undefined
        : "You must accept the terms and privacy policy",
    };
    setFieldErrors(errors);
    setFormErrors([]);
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
        consent: true,
      });
    } catch (error) {
      setFormErrors(getErrorMessages(error));
      setSubmitting(false);
      return;
    }

    try {
      await login(email.trim(), password);
    } catch {
      const params = new URLSearchParams({
        registered: "1",
        email: email.trim(),
      });
      if (next) params.set("next", next);
      router.replace(`/login?${params.toString()}`);
    }
  };

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">
          One account for flights, hotels, itineraries and stories.
        </p>
      </div>

      {formErrors.length > 0 && (
        <div className="mt-6">
          <Alert variant="error" title="Could not create your account">
            <ul className="list-disc space-y-1 pl-4">
              {formErrors.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Input
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Mariam Gad"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setFieldErrors((current) => ({ ...current, name: undefined }));
          }}
          error={fieldErrors.name}
          maxLength={100}
          required
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
          error={fieldErrors.password}
          hint={PASSWORD_MESSAGE}
          maxLength={64}
          required
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setFieldErrors((current) => ({
              ...current,
              confirmPassword: undefined,
            }));
          }}
          error={fieldErrors.confirmPassword}
          maxLength={64}
          required
        />
        <Checkbox
          label="I agree to the terms of service and privacy policy, including the processing of my account data."
          checked={consent}
          onChange={(event) => {
            setConsent(event.target.checked);
            setFieldErrors((current) => ({ ...current, consent: undefined }));
          }}
          error={fieldErrors.consent}
        />
        <Button type="submit" fullWidth loading={submitting} size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href={loginHref}
          className="font-semibold text-brand-700 transition hover:text-brand-800"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
