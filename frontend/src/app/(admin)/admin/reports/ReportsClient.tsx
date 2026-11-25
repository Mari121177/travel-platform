"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { api } from "@/lib/api/client";
import { getErrorMessages } from "@/lib/api/errors";
import type { Paginated } from "@/lib/types";
import { formatDateTime, truncate } from "@/lib/utils";
import { isValidMongoId } from "@/lib/validation";

type ReportTargetType = "post" | "comment" | "review" | "itinerary";
type ReportStatus = "open" | "resolved";
type Resolution = "dismissed" | "hidden" | "deleted";
type ResolveAction = "dismiss" | "hide" | "delete";

interface Report {
  _id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  status: ReportStatus;
  resolution: Resolution | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const TARGET_TYPES: ReportTargetType[] = [
  "post",
  "comment",
  "review",
  "itinerary",
];

const TARGET_LABELS: Record<ReportTargetType, string> = {
  post: "Post",
  comment: "Comment",
  review: "Review",
  itinerary: "Itinerary",
};

const RESOLUTION_LABELS: Record<Resolution, string> = {
  dismissed: "Dismissed",
  hidden: "Hidden",
  deleted: "Deleted",
};

const RESOLUTION_VARIANTS: Record<Resolution, BadgeVariant> = {
  dismissed: "neutral",
  hidden: "warning",
  deleted: "danger",
};

const ACTION_COPY: Record<
  ResolveAction,
  { title: string; description: string; confirmLabel: string }
> = {
  dismiss: {
    title: "Dismiss report",
    description:
      "The report will be closed and the reported content will stay visible.",
    confirmLabel: "Dismiss report",
  },
  hide: {
    title: "Hide reported content",
    description:
      "The content will be hidden from everyone except its author and admins.",
    confirmLabel: "Hide content",
  },
  delete: {
    title: "Delete reported content",
    description:
      "The content will be permanently deleted. This cannot be undone.",
    confirmLabel: "Delete content",
  },
};

function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 8)}…` : value;
}

interface PendingResolve {
  report: Report;
  action: ResolveAction;
}

interface PendingDirect {
  action: "hide" | "delete";
  type: ReportTargetType;
  id: string;
}

export function ReportsClient() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReportStatus>("open");
  const [targetType, setTargetType] = useState<ReportTargetType | "">("");
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState<Paginated<Report> | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const [detail, setDetail] = useState<Report | null>(null);
  const [pendingResolve, setPendingResolve] = useState<PendingResolve | null>(
    null,
  );
  const [resolveErrors, setResolveErrors] = useState<string[]>([]);
  const [resolveLoading, setResolveLoading] = useState(false);

  const [directType, setDirectType] = useState<ReportTargetType>("post");
  const [directId, setDirectId] = useState("");
  const [directIdError, setDirectIdError] = useState<string | undefined>(
    undefined,
  );
  const [pendingDirect, setPendingDirect] = useState<PendingDirect | null>(null);
  const [directErrors, setDirectErrors] = useState<string[]>([]);
  const [directLoading, setDirectLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setErrors([]);
      try {
        const result = await api.get<Paginated<Report>>("/admin/reports", {
          query: {
            status,
            targetType: targetType || undefined,
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
  }, [page, status, targetType, reloadKey]);

  const openResolve = (report: Report, action: ResolveAction) => {
    setPendingResolve({ report, action });
    setResolveErrors([]);
  };

  const closeResolve = () => {
    if (resolveLoading) return;
    setPendingResolve(null);
    setResolveErrors([]);
  };

  const runResolve = async () => {
    if (!pendingResolve) return;
    setResolveLoading(true);
    setResolveErrors([]);
    try {
      await api.patch<Report>(
        `/admin/reports/${pendingResolve.report._id}`,
        { action: pendingResolve.action },
      );
      setNotice(
        pendingResolve.action === "dismiss"
          ? "Report dismissed."
          : pendingResolve.action === "hide"
            ? "Reported content hidden."
            : "Reported content deleted.",
      );
      setPendingResolve(null);
      setReloadKey((key) => key + 1);
    } catch (error) {
      setResolveErrors(getErrorMessages(error));
    } finally {
      setResolveLoading(false);
    }
  };

  const startDirectAction = (action: "hide" | "delete") => {
    const value = directId.trim();
    if (!isValidMongoId(value)) {
      setDirectIdError("Enter a valid 24-character content id");
      return;
    }
    setDirectIdError(undefined);
    setDirectErrors([]);
    setPendingDirect({ action, type: directType, id: value });
  };

  const runDirectAction = async () => {
    if (!pendingDirect) return;
    setDirectLoading(true);
    setDirectErrors([]);
    try {
      if (pendingDirect.action === "hide") {
        await api.patch(
          `/admin/content/${pendingDirect.type}/${pendingDirect.id}`,
        );
        setNotice("Content hidden.");
      } else {
        await api.delete(
          `/admin/content/${pendingDirect.type}/${pendingDirect.id}`,
        );
        setNotice("Content deleted.");
      }
      setPendingDirect(null);
      setDirectId("");
      setReloadKey((key) => key + 1);
    } catch (error) {
      setDirectErrors(getErrorMessages(error));
    } finally {
      setDirectLoading(false);
    }
  };

  const handleDirectSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startDirectAction("hide");
  };

  const reports = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports and moderation"
        eyebrow="Administration"
        description="Review reported content and act on it. Every action is written to the audit log."
        actions={
          <Badge variant="neutral">
            {data ? `${data.total} ${status} reports` : "Loading…"}
          </Badge>
        }
      />

      {notice && (
        <Alert variant="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <div className="card-surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[200px_220px_auto] lg:items-end">
        <Select
          label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ReportStatus);
            setPage(1);
          }}
        >
          <option value="open">Open reports</option>
          <option value="resolved">Resolved reports</option>
        </Select>
        <Select
          label="Content type"
          placeholder="All content types"
          value={targetType}
          onChange={(event) => {
            setTargetType(event.target.value as ReportTargetType | "");
            setPage(1);
          }}
        >
          {TARGET_TYPES.map((type) => (
            <option key={type} value={type}>
              {TARGET_LABELS[type]}
            </option>
          ))}
        </Select>
        <div className="text-sm text-slate-500">
          Newest first, 10 per page.
        </div>
      </div>

      {errors.length > 0 && (
        <Alert variant="error" title="Could not load reports">
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
        {loading && !data ? (
          <TableSkeleton rows={6} columns={6} />
        ) : reports.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={status === "open" ? "No open reports" : "No reports found"}
              description={
                status === "open"
                  ? "Nothing needs moderation right now."
                  : "Try another status or content type."
              }
            />
          </div>
        ) : (
          <Table>
            <THead>
              <Tr>
                <Th>Content</Th>
                <Th>Reason</Th>
                <Th>Reporter</Th>
                <Th>Reported</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </THead>
            <TBody>
              {reports.map((report) => (
                <Tr key={report._id}>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <Badge variant="brand">
                        {TARGET_LABELS[report.targetType]}
                      </Badge>
                      <span
                        className="font-mono text-xs text-slate-500"
                        title={report.targetId}
                      >
                        {shortId(report.targetId)}
                      </span>
                    </div>
                  </Td>
                  <Td
                    className="max-w-xs text-slate-600"
                    title={report.reason}
                  >
                    {truncate(report.reason, 90)}
                  </Td>
                  <Td
                    className="font-mono text-xs text-slate-500"
                    title={report.reporterId}
                  >
                    {shortId(report.reporterId)}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-500">
                    {formatDateTime(report.createdAt)}
                  </Td>
                  <Td>
                    {report.status === "open" ? (
                      <Badge variant="warning">Open</Badge>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <Badge variant="success">Resolved</Badge>
                        {report.resolution && (
                          <Badge
                            variant={RESOLUTION_VARIANTS[report.resolution]}
                          >
                            {RESOLUTION_LABELS[report.resolution]}
                          </Badge>
                        )}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetail(report)}
                      >
                        View
                      </Button>
                      {report.status === "open" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openResolve(report, "dismiss")}
                          >
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openResolve(report, "hide")}
                          >
                            Hide
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openResolve(report, "delete")}
                          >
                            Delete
                          </Button>
                        </>
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

      <Card>
        <CardHeader>
          <CardTitle>Direct content action</CardTitle>
          <p className="text-sm text-slate-500">
            Hide or delete a post, comment, review or itinerary by its id,
            without waiting for a report.
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleDirectSubmit}
            className="grid gap-3 sm:grid-cols-[200px_1fr_auto_auto] sm:items-end"
          >
            <Select
              label="Content type"
              value={directType}
              onChange={(event) =>
                setDirectType(event.target.value as ReportTargetType)
              }
            >
              {TARGET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TARGET_LABELS[type]}
                </option>
              ))}
            </Select>
            <Input
              label="Content id"
              placeholder="24-character id"
              value={directId}
              onChange={(event) => {
                setDirectId(event.target.value);
                setDirectIdError(undefined);
              }}
              error={directIdError}
              maxLength={24}
            />
            <Button type="submit" variant="outline">
              Hide content
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => startDirectAction("delete")}
            >
              Delete content
            </Button>
          </form>
        </CardContent>
      </Card>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Report details"
        description={
          detail
            ? `${TARGET_LABELS[detail.targetType]} · ${detail._id}`
            : undefined
        }
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setDetail(null)}>
            Close
          </Button>
        }
      >
        {detail && (
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Reason
              </dt>
              <dd className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-slate-700">
                {detail.reason}
              </dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Target
                </dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-600">
                  {detail.targetType} · {detail.targetId}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Reporter
                </dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-600">
                  {detail.reporterId}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Reported at
                </dt>
                <dd className="mt-1 text-slate-600">
                  {formatDateTime(detail.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {detail.status === "open" ? (
                    <Badge variant="warning">Open</Badge>
                  ) : (
                    <>
                      <Badge variant="success">Resolved</Badge>
                      {detail.resolution && (
                        <Badge
                          variant={RESOLUTION_VARIANTS[detail.resolution]}
                        >
                          {RESOLUTION_LABELS[detail.resolution]}
                        </Badge>
                      )}
                    </>
                  )}
                </dd>
              </div>
              {detail.resolvedAt && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Resolved at
                  </dt>
                  <dd className="mt-1 text-slate-600">
                    {formatDateTime(detail.resolvedAt)}
                  </dd>
                </div>
              )}
            </div>
          </dl>
        )}
      </Modal>

      {pendingResolve && (
        <ConfirmDialog
          open
          onClose={closeResolve}
          onConfirm={runResolve}
          title={ACTION_COPY[pendingResolve.action].title}
          description={ACTION_COPY[pendingResolve.action].description}
          confirmLabel={ACTION_COPY[pendingResolve.action].confirmLabel}
          variant={
            pendingResolve.action === "delete" ? "danger" : "primary"
          }
          loading={resolveLoading}
        >
          <div className="space-y-3">
            {resolveErrors.length > 0 && (
              <Alert variant="error" title="Could not resolve the report">
                <ul className="list-disc space-y-1 pl-4">
                  {resolveErrors.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </Alert>
            )}
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-700">Reason:</span>{" "}
              {pendingResolve.report.reason}
            </p>
          </div>
        </ConfirmDialog>
      )}

      {pendingDirect && (
        <ConfirmDialog
          open
          onClose={() => {
            if (!directLoading) {
              setPendingDirect(null);
              setDirectErrors([]);
            }
          }}
          onConfirm={runDirectAction}
          title={
            pendingDirect.action === "hide"
              ? "Hide content"
              : "Delete content"
          }
          description={`${TARGET_LABELS[pendingDirect.type]} · ${pendingDirect.id}`}
          confirmLabel={
            pendingDirect.action === "hide" ? "Hide content" : "Delete content"
          }
          variant={pendingDirect.action === "delete" ? "danger" : "primary"}
          loading={directLoading}
        >
          {directErrors.length > 0 && (
            <Alert variant="error" title="Could not update the content">
              <ul className="list-disc space-y-1 pl-4">
                {directErrors.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </Alert>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
