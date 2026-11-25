"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";
import { getErrorMessages } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ROLE_LABELS } from "@/lib/auth/roles";
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_VARIANTS,
} from "@/lib/status";
import type {
  AuthUser,
  ListResponse,
  ReferenceCountry,
} from "@/lib/types";
import {
  PASSWORD_MESSAGE,
  validateCurrency,
  validateName,
  validatePassword,
  validatePhone,
} from "@/lib/validation";

interface Profile extends AuthUser {
  phone: string | null;
}

interface ProfileFieldErrors {
  name?: string;
  phone?: string;
  currency?: string;
}

interface PasswordFieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function ProfileClient() {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordRequired = searchParams.get("password") === "required";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [currencyOptions, setCurrencyOptions] = useState<string[]>([]);
  const [profileErrors, setProfileErrors] = useState<ProfileFieldErrors>({});
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] =
    useState<PasswordFieldErrors>({});
  const [passwordFormErrors, setPasswordFormErrors] = useState<string[]>([]);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateErrors, setDeactivateErrors] = useState<string[]>([]);

  const mustChangeFromAuth = Boolean(user?.mustChangePassword);

  useEffect(() => {
    if (mustChangeFromAuth) {
      setLoading(false);
      setLoadErrors([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadErrors([]);
      try {
        const data = await api.get<Profile>("/users/me");
        if (cancelled) return;
        setProfile(data);
        setName(data.name);
        setPhone(data.phone ?? "");
        setCurrency(data.preferredCurrency);
      } catch (error) {
        if (!cancelled) setLoadErrors(getErrorMessages(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, mustChangeFromAuth]);

  useEffect(() => {
    let cancelled = false;

    const loadCurrencies = async () => {
      try {
        const response =
          await api.get<ListResponse<ReferenceCountry>>("/reference/countries");
        if (cancelled) return;
        const unique = [
          ...new Set(response.data.map((country) => country.currency)),
        ].sort();
        setCurrencyOptions(unique);
      } catch {
        if (!cancelled) setCurrencyOptions([]);
      }
    };

    void loadCurrencies();
    return () => {
      cancelled = true;
    };
  }, []);

  const currencyChoices = useMemo(() => {
    const values = new Set(currencyOptions);
    if (currency) values.add(currency.toUpperCase());
    return [...values].sort();
  }, [currencyOptions, currency]);

  const mustChangePassword = Boolean(
    profile?.mustChangePassword ?? user?.mustChangePassword,
  );

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: ProfileFieldErrors = {
      name: validateName(name) ?? undefined,
      phone: validatePhone(phone) ?? undefined,
      currency: validateCurrency(currency) ?? undefined,
    };
    setProfileErrors(errors);
    setSaveErrors([]);
    setSaveSuccess(null);
    if (Object.values(errors).some(Boolean)) return;

    setSaving(true);
    try {
      const updated = await api.patch<Profile>("/users/me", {
        name: name.trim(),
        phone: phone.trim() === "" ? null : phone.trim(),
        preferredCurrency: currency.trim().toUpperCase(),
      });
      setProfile(updated);
      setName(updated.name);
      setPhone(updated.phone ?? "");
      setCurrency(updated.preferredCurrency);
      if (user) {
        setUser({
          ...user,
          name: updated.name,
          preferredCurrency: updated.preferredCurrency,
          mustChangePassword: updated.mustChangePassword,
        });
      }
      setSaveSuccess("Your profile has been saved.");
    } catch (error) {
      setSaveErrors(getErrorMessages(error));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: PasswordFieldErrors = {
      currentPassword:
        currentPassword.trim().length === 0
          ? "Current password is required"
          : undefined,
      newPassword: validatePassword(newPassword) ?? undefined,
      confirmPassword:
        confirmPassword !== newPassword ? "Passwords do not match" : undefined,
    };
    setPasswordErrors(errors);
    setPasswordFormErrors([]);
    setPasswordSuccess(null);
    if (Object.values(errors).some(Boolean)) return;

    setChangingPassword(true);
    try {
      const updated = await api.patch<AuthUser>("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setLoading(true);
      setUser(updated);
      setProfile((current) =>
        current
          ? { ...current, mustChangePassword: updated.mustChangePassword }
          : current,
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(
        "Your password has been changed. The rest of your account is now available.",
      );
    } catch (error) {
      setPasswordFormErrors(getErrorMessages(error));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    setDeactivateErrors([]);
    try {
      await api.delete("/users/me");
      await logout();
      router.replace("/");
      router.refresh();
    } catch (error) {
      setDeactivateErrors(getErrorMessages(error));
    } finally {
      setDeactivating(false);
    }
  };

  if (!profile && !mustChangePassword) {
    if (loading) {
      return <FullPageSpinner label="Loading your profile…" />;
    }
    return (
      <ErrorState
        title="Could not load your profile"
        messages={loadErrors}
        onRetry={() => setReloadKey((key) => key + 1)}
      />
    );
  }

  const displayUser = profile ?? user;

  if (!displayUser) {
    return <FullPageSpinner label="Loading your profile…" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={mustChangePassword ? "Set a new password" : "My profile"}
        description={
          mustChangePassword
            ? "Your account is using a temporary password. Choose a new password to continue."
            : "Manage your personal details, password and account status."
        }
      />

      {passwordRequired && mustChangePassword && (
        <Alert variant="warning" title="New password required">
          An administrator reset your password. Set your own password to unlock
          the rest of the platform.
        </Alert>
      )}

      {loadErrors.length > 0 && (
        <Alert variant="error" title="Could not refresh your profile">
          <ul className="list-disc space-y-1 pl-4">
            {loadErrors.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!mustChangePassword && (
            <Card>
              <CardHeader>
                <CardTitle>Personal details</CardTitle>
                <CardDescription>
                  Update your name, phone number and preferred currency.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSaveProfile} noValidate>
                <CardContent className="space-y-4">
                  {saveErrors.length > 0 && (
                    <Alert variant="error" title="Could not save your profile">
                      <ul className="list-disc space-y-1 pl-4">
                        {saveErrors.map((message, index) => (
                          <li key={index}>{message}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                  {saveSuccess && (
                    <Alert variant="success" onDismiss={() => setSaveSuccess(null)}>
                      {saveSuccess}
                    </Alert>
                  )}
                  <Input
                    label="Full name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setProfileErrors((current) => ({
                        ...current,
                        name: undefined,
                      }));
                    }}
                    error={profileErrors.name}
                    maxLength={100}
                    autoComplete="name"
                    required
                  />
                  <Input
                    label="Phone number"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setProfileErrors((current) => ({
                        ...current,
                        phone: undefined,
                      }));
                    }}
                    error={profileErrors.phone}
                    hint="Optional. 7-15 digits, may start with +. Leave empty to remove it."
                    maxLength={25}
                    autoComplete="tel"
                    placeholder="+20 100 123 4567"
                  />
                  {currencyChoices.length > 0 ? (
                    <Select
                      label="Preferred currency"
                      value={currency}
                      onChange={(event) => {
                        setCurrency(event.target.value);
                        setProfileErrors((current) => ({
                          ...current,
                          currency: undefined,
                        }));
                      }}
                      error={profileErrors.currency}
                      hint="Used to display itinerary budgets."
                    >
                      {currencyChoices.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      label="Preferred currency"
                      value={currency}
                      onChange={(event) => {
                        setCurrency(event.target.value.toUpperCase());
                        setProfileErrors((current) => ({
                          ...current,
                          currency: undefined,
                        }));
                      }}
                      error={profileErrors.currency}
                      hint="A 3-letter currency code, for example USD."
                      maxLength={3}
                    />
                  )}
                </CardContent>
                <CardFooter>
                  <Button type="submit" loading={saving}>
                    Save changes
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>
                Enter your current password and choose a new one.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword} noValidate>
              <CardContent className="space-y-4">
                {passwordFormErrors.length > 0 && (
                  <Alert
                    variant="error"
                    title="Could not change your password"
                  >
                    <ul className="list-disc space-y-1 pl-4">
                      {passwordFormErrors.map((message, index) => (
                        <li key={index}>{message}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
                {passwordSuccess && (
                  <Alert
                    variant="success"
                    onDismiss={() => setPasswordSuccess(null)}
                  >
                    {passwordSuccess}
                  </Alert>
                )}
                <Input
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setPasswordErrors((current) => ({
                      ...current,
                      currentPassword: undefined,
                    }));
                  }}
                  error={passwordErrors.currentPassword}
                  required
                />
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    setPasswordErrors((current) => ({
                      ...current,
                      newPassword: undefined,
                    }));
                  }}
                  error={passwordErrors.newPassword}
                  hint={PASSWORD_MESSAGE}
                  maxLength={64}
                  required
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setPasswordErrors((current) => ({
                      ...current,
                      confirmPassword: undefined,
                    }));
                  }}
                  error={passwordErrors.confirmPassword}
                  maxLength={64}
                  required
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" loading={changingPassword}>
                  Change password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Email
                </p>
                <p className="mt-1 break-all font-medium text-slate-700">
                  {displayUser.email}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Role
                </p>
                <p className="mt-1 font-medium text-slate-700">
                  {ROLE_LABELS[displayUser.role]}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </p>
                <div className="mt-1">
                  <Badge variant={ACCOUNT_STATUS_VARIANTS[displayUser.status]}>
                    {ACCOUNT_STATUS_LABELS[displayUser.status]}
                  </Badge>
                </div>
              </div>
              {displayUser.assignedProviderId && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Assigned provider
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-600">
                    {displayUser.assignedProviderId}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {!mustChangePassword && displayUser.role === "user" && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-700">Danger zone</CardTitle>
                <CardDescription>
                  Deactivating your account cannot be undone by you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  Deactivation is blocked while you have upcoming confirmed
                  bookings or an active payment hold. Your posts and public
                  itineraries will be hidden.
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="danger"
                  onClick={() => {
                    setDeactivateErrors([]);
                    setDeactivateOpen(true);
                  }}
                >
                  Deactivate account
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={handleDeactivate}
        title="Deactivate your account?"
        description="This will deactivate your account and sign you out. You cannot reactivate it yourself."
        confirmLabel="Deactivate account"
        loading={deactivating}
      >
        {deactivateErrors.length > 0 && (
          <Alert variant="error" title="Could not deactivate your account">
            <ul className="list-disc space-y-1 pl-4">
              {deactivateErrors.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </Alert>
        )}
      </ConfirmDialog>
    </div>
  );
}
