import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function AdminAuditLogsPage() {
  return (
    <RoutePlaceholder
      title="Audit logs"
      owner="Ghada"
      requirements={["GEN-07", "GEN-05"]}
      description="Show the audit log of admin actions newest first, with pagination."
    />
  );
}
