"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { signIn } from "next-auth/react";

import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

type ApiError = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    try {
      await axios.post("/api/auth/register", values);

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setServerError("Account created, but automatic sign-in failed. Please log in.");
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      const err = error as AxiosError<ApiError>;
      setServerError(err.response?.data?.message ?? "Registration failed.");
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Already have one?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              {...register("name")}
              className="mt-1 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="mt-1 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              className="mt-1 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-red-600" role="alert">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
