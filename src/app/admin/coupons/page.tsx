import { ComingSoon } from "../_components/ComingSoon";

export default function AdminCouponsPage() {
  return (
    <ComingSoon
      title="Coupons"
      description="Issue and retire discount codes."
      planned={[
        "Coupon table (code, discount type/value, expiry, usage counter).",
        "Create / edit coupon form.",
        "Deactivate without deleting history.",
        "Hook into checkout once payment lands.",
      ]}
    />
  );
}
