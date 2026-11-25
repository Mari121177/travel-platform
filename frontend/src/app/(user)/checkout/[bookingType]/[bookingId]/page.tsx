import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function CheckoutPage() {
  return (
    <RoutePlaceholder
      title="Checkout"
      owner="Habiba Ahmed"
      requirements={["PAY-01", "PAY-02", "PAY-03"]}
      description="Show the flight or hotel policies, require acceptance, collect payment with Stripe Elements, and handle success, failure, retry and refund status."
    />
  );
}
