import { ComingSoon } from "../_components/ComingSoon";

export default function AdminCartsPage() {
  return (
    <ComingSoon
      title="Carts"
      description="Inspect active carts to debug support tickets and surface abandonment."
      planned={[
        "Active carts list (user, item count, subtotal, last updated).",
        "Cart detail (line items with live price vs snapshot diffs).",
        "Abandoned-cart filter (updatedAt older than N days, non-empty).",
        "Purge cart (admin-only) for support workflows.",
      ]}
    />
  );
}
