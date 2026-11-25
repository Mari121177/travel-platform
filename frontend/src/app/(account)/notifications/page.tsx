import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function NotificationsPage() {
  return (
    <RoutePlaceholder
      title="Notifications"
      owner="Habiba Ahmed"
      requirements={["GEN-01"]}
      description="List notifications newest first, mark one or all as read, and show the unread state. Dispatch the notifications:updated window event after marking so the bell badge refreshes."
    />
  );
}
