"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Plus } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_VARIANTS,
  ACCOUNT_STATUSES,
  ASSIGNABLE_ROLES,
} from "@/lib/status";
import { api } from "@/lib/api/client";
import { getErrorMessages } from "@/lib/api/errors";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type {
  AccountStatus,
  Paginated,
  Role,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  isValidMongoId,
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/validation";

interface Account {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  registeredAt: string;
}

type ActionKind = "suspend" | "reactivate" | "reset";

interface PendingAction {
  kind: ActionKind;
  account: Account;
}

type ModeratorType = "hotel" | "airline";

const ROLE_VARIANTS: Record<Role, BadgeVariant> = {
  user: "neutral",
  admin: "info",
  airline_moderator: "brand",
  hotel_moderator: "brand",
};

function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(10);
  window.crypto.getRandomValues(bytes);
  let result = "";
  for (let index = 0; index < bytes.length; index += 1) {
    result += alphabet[bytes[index] % alphabet.length];
  }
  return `Tmp${result}9`;
}

export function AccountsClient() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [status, setStatus] = useState<AccountStatus | "">("");
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState<Paginated<Account> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [temporaryPasswordError, setTemporaryPasswordError] = useState<
    string | undefined
  >(undefined);
  const [actionErrors, setActionErrors] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [moderatorName, setModeratorName] = useState("");
  const [moderatorEmail, setModeratorEmail] = useState("");
  const [moderatorType, setModeratorType] = useState<ModeratorType>("hotel");
  const [providerId, setProviderId] = useState("");
  const [moderatorPassword, setModeratorPassword] = useState("");
  const [createFieldErrors, setCreateFieldErrors] = useState<{
    name?: string;
    email?: string;
    providerId?: string;
    password?: string;
  }>({});
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setErrors([]);
      try {
        const result = await api.get<Paginated<Account>>("/admin/accounts", {
          query: {
            q: committedQuery || undefined,
            role: role || undefined,
            status: status || undefined,
            page,
          },
          signal: controller.signal,
        });
        if (active) {
          setData(result);
          if (result.totalPages > 0 && page > result.totalPages) {
            setPage(result.totalPages);
          }
        }
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setErrors(getErrorMessages(error));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [page, committedQuery, role, status, reloadKey]);

  const openAction = (kind: ActionKind, account: Account) => {
    setPending({ kind, account });
    setReason("");
    setTemporaryPassword("");
    setTemporaryPasswordError(undefined);
    setActionErrors([]);
  };

  const closeAction = () => {
    if (actionLoading) return;
    setPending(null);
    setActionErrors([]);
  };

  const runAction = async () => {
    if (!pending) return;

    if (pending.kind === "reset") {
      const passwordError = validatePassword(temporaryPassword);
      if (passwordError) {
        setTemporaryPasswordError(passwordError);
        return;
      }
    }

    setActionLoading(true);
    setActionErrors([]);
    try {
      if (pending.kind === "suspend") {
        await api.patch<Account>(
          `/admin/accounts/${pending.account.id}/suspend`,
          { reason: reason.trim() || undefined },
        );
        setNotice(`${pending.account.name} has been suspended.`);
      } else if (pending.kind === "reactivate") {
        await api.patch<Account>(
          `/admin/accounts/${pending.account.id}/reactivate`,
        );
        setNotice(`${pending.account.name} has been reactivated.`);
      } else {
        await api.post<Account>(
          `/admin/users/${pending.account.id}/reset-password`,
          { temporaryPassword },
        );
        setNotice(
          `Password reset for ${pending.account.name}. They must change it at their next login.`,
        );
      }
      setPending(null);
      setReloadKey((key) => key + 1);
    } catch (error) {
      setActionErrors(getErrorMessages(error));
    } finally {
      setActionLoading(false);
    }
  };

  const generatePassword = () => {
    setTemporaryPassword(generateTemporaryPassword());
    setTemporaryPasswordError(undefined);
  };

  const resetCreateForm = () => {
    setModeratorName("");
    setModeratorEmail("");
    setModeratorType("hotel");
    setProviderId("");
    setModeratorPassword("");
    setCreateFieldErrors({});
    setCreateErrors([]);
  };

  const openCreate = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (creating) return;
    setCreateOpen(false);
    setCreateErrors([]);
  };

  const handleCreateModerator = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const errors = {
      name: validateName(moderatorName) ?? undefined,
      email: validateEmail(moderatorEmail) ?? undefined,
      providerId: isValidMongoId(providerId)
        ? undefined
        : "Enter a valid 24-character provider id",
      password: validatePassword(moderatorPassword) ?? undefined,
    };
    setCreateFieldErrors(errors);
    setCreateErrors([]);
    if (Object.values(errors).some(Boolean)) return;

    setCreating(true);
    try {
      await api.post<Account>("/admin/moderators", {
        name: moderatorName.trim(),
        email: moderatorEmail.trim(),
        type: moderatorType,
        providerId: providerId.trim(),
        temporaryPassword: moderatorPassword,
      });
      setNotice(
        `Moderator ${moderatorName.trim()} created. They must change the temporary password at first login.`,
      );
      setCreateOpen(false);
      resetCreateForm();
      setReloadKey((key) => key + 1);
    } catch (error) {
      setCreateErrors(getErrorMessages(error));
    } finally {
      setCreating(false);
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setCommittedQuery(query.trim());
  };

  const clearFilters = () => {
    setQuery("");
    setCommittedQuery("");
    setRole("");
    setStatus("");
    setPage(1);
  };

  const accounts = data?.items ?? [];
  const canSuspend = (account: Account) =>
    account.status === "active" && account.role !== "admin";
  const canReactivate = (account: Account) =>
    account.status === "suspended" && account.role !== "admin";
  const canReset = (account: Account) =>
    account.status !== "deactivated" && account.role !== "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        eyebrow="Administration"
        description="Search every account, filter by role and status, and manage access."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">
              {data ? `${data.total} accounts` : "Loading…"}
            </Badge>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create moderator
            </Button>
          </div>
        }
      />

      {notice && (
        <Alert variant="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <form
        onSubmit={handleSearch}
        className="card-surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px_auto]"
      >
        <Input
          aria-label="Search by name or email"
          placeholder="Search name or email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={100}
        />
        <Select
          aria-label="Filter by role"
          placeholder="All roles"
          value={role}
          onChange={(event) => {
            setRole(event.target.value as Role | "");
            setPage(1);
          }}
        >
          {ASSIGNABLE_ROLES.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABELS[option]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by status"
          placeholder="All statuses"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as AccountStatus | "");
            setPage(1);
          }}
        >
          {ACCOUNT_STATUSES.map((option) => (
            <option key={option} value={option}>
              {ACCOUNT_STATUS_LABELS[option]}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Search
          </Button>
          <Button type="button" variant="outline" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </form>

      {errors.length > 0 && (
        <Alert variant="error" title="Could not load accounts">
          <ul className="list-disc space-y-1 pl-4">
            {errors.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Try again
            </Button>
          </div>
        </Alert>
      )}

      <div className="card-surface overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">All accounts</h2>
            <p className="text-sm text-slate-500">
              Newest first, 10 per page. Admin accounts cannot be managed here.
            </p>
          </div>
          {loading && data && (
            <span className="text-xs font-medium text-slate-400">Updating…</span>
          )}
        </div>

        {loading && !data ? (
          <TableSkeleton rows={6} columns={5} />
        ) : accounts.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No accounts found"
              description="Try a different search or clear the filters."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Registered</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </THead>
            <TBody>
              {accounts.map((account) => (
                <Tr key={account.id}>
                  <Td className="font-medium text-ink">{account.name}</Td>
                  <Td className="break-all text-slate-600">{account.email}</Td>
                  <Td>
                    <Badge variant={ROLE_VARIANTS[account.role]}>
                      {ROLE_LABELS[account.role]}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge variant={ACCOUNT_STATUS_VARIANTS[account.status]}>
                      {ACCOUNT_STATUS_LABELS[account.status]}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-slate-500">
                    {formatDate(account.registeredAt)}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {canSuspend(account) && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => openAction("suspend", account)}
                        >
                          Suspend
                        </Button>
                      )}
                      {canReactivate(account) && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => openAction("reactivate", account)}
                        >
                          Reactivate
                        </Button>
                      )}
                      {canReset(account) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAction("reset", account)}
                        >
                          Reset password
                        </Button>
                      )}
                      {!canSuspend(account) &&
                        !canReactivate(account) &&
                        !canReset(account) && (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}

        {data && data.totalPages > 1 && (
          <div className="border-t border-line px-5 py-4">
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
              disabled={loading}
            />
          </div>
        )}
      </div>

      {pending?.kind === "suspend" && (
        <ConfirmDialog
          open
          onClose={closeAction}
          onConfirm={runAction}
          title="Suspend account"
          description={`Suspend ${pending.account.name}? They will not be able to log in until reactivated.`}
          confirmLabel="Suspend account"
          loading={actionLoading}
        >
          <div className="space-y-3">
            {actionErrors.length > 0 && (
              <Alert variant="error" title="Could not suspend the account">
                <ul className="list-disc space-y-1 pl-4">
                  {actionErrors.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </Alert>
            )}
            <Textarea
              label="Reason"
              optional
              placeholder="For example: abusive content in blog comments"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-slate-400">
              The reason is written to the audit log and sent to the account as
              a notification.
            </p>
          </div>
        </ConfirmDialog>
      )}

      {pending?.kind === "reactivate" && (
        <ConfirmDialog
          open
          onClose={closeAction}
          onConfirm={runAction}
          title="Reactivate account"
          description={`Reactivate ${pending.account.name}? They will be able to log in again.`}
          confirmLabel="Reactivate"
          variant="primary"
          loading={actionLoading}
        >
          {actionErrors.length > 0 && (
            <Alert variant="error" title="Could not reactivate the account">
              <ul className="list-disc space-y-1 pl-4">
                {actionErrors.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </Alert>
          )}
        </ConfirmDialog>
      )}

      {pending?.kind === "reset" && (
        <Modal
          open
          onClose={closeAction}
          title="Reset password"
          description={`Set a temporary password for ${pending.account.name}. They must choose a new password at their next login.`}
          size="sm"
          closeOnBackdrop={!actionLoading}
          footer={
            <>
              <Button
                variant="outline"
                onClick={closeAction}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button onClick={runAction} loading={actionLoading}>
                Reset password
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {actionErrors.length > 0 && (
              <Alert variant="error" title="Could not reset the password">
                <ul className="list-disc space-y-1 pl-4">
                  {actionErrors.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </Alert>
            )}
            <div className="flex items-end gap-2">
              <Input
                label="Temporary password"
                value={temporaryPassword}
                onChange={(event) => {
                  setTemporaryPassword(event.target.value);
                  setTemporaryPasswordError(undefined);
                }}
                error={temporaryPasswordError}
                hint="At least 8 characters with a letter and a digit."
                maxLength={64}
                autoComplete="new-password"
                containerClassName="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
                className="mb-6"
              >
                Generate
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              Copy this password and share it privately with the account owner.
              It cannot be shown again.
            </p>
          </div>
        </Modal>
      )}

      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="Create moderator"
        description="Create a hotel or airline moderator linked to exactly one provider. They must change the temporary password at their first login."
        size="lg"
        closeOnBackdrop={!creating}
      >
        <form onSubmit={handleCreateModerator} className="space-y-4" noValidate>
          {createErrors.length > 0 && (
            <Alert variant="error" title="Could not create the moderator">
              <ul className="list-disc space-y-1 pl-4">
                {createErrors.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </Alert>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Full name"
              value={moderatorName}
              onChange={(event) => {
                setModeratorName(event.target.value);
                setCreateFieldErrors((current) => ({
                  ...current,
                  name: undefined,
                }));
              }}
              error={createFieldErrors.name}
              maxLength={100}
              autoComplete="name"
              required
            />
            <Input
              label="Email"
              type="email"
              value={moderatorEmail}
              onChange={(event) => {
                setModeratorEmail(event.target.value);
                setCreateFieldErrors((current) => ({
                  ...current,
                  email: undefined,
                }));
              }}
              error={createFieldErrors.email}
              maxLength={254}
              autoComplete="email"
              required
            />
            <Select
              label="Moderator type"
              value={moderatorType}
              onChange={(event) =>
                setModeratorType(event.target.value as ModeratorType)
              }
            >
              <option value="hotel">Hotel moderator</option>
              <option value="airline">Airline moderator</option>
            </Select>
            <Input
              label="Provider id"
              value={providerId}
              onChange={(event) => {
                setProviderId(event.target.value);
                setCreateFieldErrors((current) => ({
                  ...current,
                  providerId: undefined,
                }));
              }}
              error={createFieldErrors.providerId}
              hint="24-character hotel or airline id"
              maxLength={24}
              required
            />
          </div>
          <div className="flex items-end gap-2">
            <Input
              label="Temporary password"
              value={moderatorPassword}
              onChange={(event) => {
                setModeratorPassword(event.target.value);
                setCreateFieldErrors((current) => ({
                  ...current,
                  password: undefined,
                }));
              }}
              error={createFieldErrors.password}
              hint="At least 8 characters with a letter and a digit."
              maxLength={64}
              autoComplete="new-password"
              containerClassName="flex-1"
              required
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setModeratorPassword(generateTemporaryPassword());
                setCreateFieldErrors((current) => ({
                  ...current,
                  password: undefined,
                }));
              }}
              className="mb-6"
            >
              Generate
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            Copy the temporary password and share it privately with the
            moderator. A provider list endpoint is still pending; paste the
            provider id from the provider record for now.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeCreate}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create moderator
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
