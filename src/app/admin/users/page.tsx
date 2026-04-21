import { ComingSoon } from "../_components/ComingSoon";

export default function AdminUsersPage() {
  return (
    <ComingSoon
      title="Users"
      description="Manage accounts and admin role assignments."
      planned={[
        "Paginated user table with search (name, email, provider, role).",
        "Promote / demote admin role (with self-demotion guard).",
        "User detail: order history, lifetime spend, current cart.",
        "Suspend account (blocks sign-in without deleting data).",
      ]}
    />
  );
}
