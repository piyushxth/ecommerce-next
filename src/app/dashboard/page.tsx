import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Signed in as{" "}
          <span className="font-medium">{session.user.email}</span>
          {session.user.role === "admin" && " (admin)"}
        </p>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Name</dt>
            <dd>{session.user.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">User ID</dt>
            <dd className="font-mono text-xs">{session.user.id}</dd>
          </div>
        </dl>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
