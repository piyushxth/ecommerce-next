import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 p-8 dark:bg-black">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Ecommerce</h1>
        <p className="mt-2 text-neutral-500">
          A full-stack Next.js + MongoDB ecommerce app.
        </p>
      </div>

      {session?.user ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm">
            Signed in as <span className="font-medium">{session.user.email}</span>
          </p>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Go to dashboard
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium dark:border-white/20"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-black px-5 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-black/10 px-5 py-2 text-sm font-medium dark:border-white/20"
          >
            Create account
          </Link>
        </div>
      )}
    </main>
  );
}
