import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "./PageHeader";

export interface RoutePlaceholderProps {
  title: string;
  owner: string;
  requirements: string | string[];
  description?: string;
  children?: ReactNode;
}

export function RoutePlaceholder({
  title,
  owner,
  requirements,
  description,
  children,
}: RoutePlaceholderProps) {
  const requirementList = Array.isArray(requirements)
    ? requirements
    : [requirements];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={
          description ?? "This route is ready for its owner to implement."
        }
      />
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="warning">Placeholder</Badge>
          <Badge variant="neutral">Owner: {owner}</Badge>
          {requirementList.map((requirement) => (
            <Badge key={requirement} variant="brand">
              {requirement}
            </Badge>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Implement this page inside this route folder. Use the shared UI kit,
          the api client, the auth context and the layout that already wraps
          this page. Backend validation and authorization remain authoritative.
        </p>
        {children && <div className="mt-5">{children}</div>}
      </Card>
    </div>
  );
}
