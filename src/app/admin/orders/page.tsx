import { ComingSoon } from "../_components/ComingSoon";

export default function AdminOrdersPage() {
  return (
    <ComingSoon
      title="Orders"
      description="Review orders, inspect line items, and move them through the fulfilment pipeline."
      planned={[
        "Paginated orders table with status and user filters.",
        "Order detail view (items snapshot, addresses, notes, contact email).",
        "Status transitions (pending → paid → shipped → delivered; cancel / refund).",
        "At-payment-capture: atomic stock decrement with $gte guards.",
      ]}
    />
  );
}
