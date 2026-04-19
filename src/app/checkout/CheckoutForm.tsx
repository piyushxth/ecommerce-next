"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";

import { useCartStore } from "@/lib/cart/store";
import type { CartItem } from "@/lib/cart/types";
import {
  checkoutSchema,
  type CheckoutInput,
} from "@/lib/validations/checkout";

type Props = {
  defaultEmail: string;
  defaultFullName: string;
  items: CartItem[];
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

type ApiError = {
  error?: string;
  issues?: { formErrors: string[]; fieldErrors: Record<string, string[]> };
};

export function CheckoutForm({ defaultEmail, defaultFullName, items }: Props) {
  const router = useRouter();
  const setServerCart = useCartStore((s) => s.setServerCart);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    // `shouldUnregister: true` is load-bearing: without it, RHF keeps stale
    // billing values in form state after the user un-checks "Same as
    // shipping", fills nothing, then re-checks it. On submit those empty
    // strings would fail `addressSchema.min()` checks inside the resolver,
    // but the billing fields are unmounted so the errors wouldn't render —
    // the form would just silently refuse to submit.
    shouldUnregister: true,
    defaultValues: {
      email: defaultEmail,
      shipping: {
        fullName: defaultFullName,
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        phone: "",
      },
      billingSameAsShipping: true,
      notes: "",
    },
  });

  const billingSameAsShipping = watch("billingSameAsShipping");

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  async function onSubmit(values: CheckoutInput) {
    setServerError(null);
    try {
      const res = await axios.post<{ orderId: string }>(
        "/api/checkout",
        values,
      );
      // Checkout clears the cart server-side. Flip the local store to match
      // so the drawer doesn't briefly show the just-purchased items on the
      // way to the success page.
      setServerCart([]);
      router.push(`/checkout/success/${res.data.orderId}`);
      router.refresh();
    } catch (error) {
      const err = error as AxiosError<ApiError>;
      setServerError(
        err.response?.data?.error ?? "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]"
      noValidate
    >
      {/* Left column: forms */}
      <div className="space-y-8">
        <Section title="Contact">
          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              autoComplete="email"
              className={inputClass}
              {...register("email")}
            />
          </Field>
        </Section>

        <Section title="Shipping address">
          <AddressFields prefix="shipping" register={register} errors={errors.shipping} />
        </Section>

        <Section title="Billing address">
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-neutral-300"
              {...register("billingSameAsShipping")}
            />
            Same as shipping address
          </label>

          {!billingSameAsShipping && (
            <div className="mt-4">
              <AddressFields
                prefix="billing"
                register={register}
                errors={errors.billing}
              />
            </div>
          )}
        </Section>

        <Section title="Order notes (optional)">
          <textarea
            rows={3}
            className={`${inputClass} resize-none`}
            placeholder="Anything the courier should know?"
            {...register("notes")}
          />
          {errors.notes && (
            <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
          )}
        </Section>

        {serverError && (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
          >
            {serverError}
          </p>
        )}
      </div>

      {/* Right column: order summary, sticky on desktop */}
      <aside className="h-fit space-y-5 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm lg:sticky lg:top-24 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Order summary
        </h2>

        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.variantId} className="flex gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col text-sm">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {item.productName}
                </span>
                <span className="text-xs text-neutral-500">
                  {item.color.name} · {item.size.name} · Qty {item.quantity}
                </span>
                <span className="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-1 border-t border-neutral-200 pt-4 text-sm dark:border-neutral-800">
          <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
          <SummaryRow label="Shipping" value="Calculated at fulfillment" />
          <SummaryRow label="Taxes" value="Calculated at fulfillment" />
          <div className="mt-3 flex items-baseline justify-between border-t border-neutral-200 pt-3 text-base font-semibold dark:border-neutral-800">
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {isSubmitting ? "Placing order..." : "Place order"}
        </button>

        <p className="text-[11px] text-neutral-500">
          Payment integration is not wired yet. Placing the order creates a
          pending record you can view on the confirmation page.
        </p>
      </aside>
    </form>
  );
}

// --- small presentational helpers -----------------------------------------

const inputClass =
  "mt-1 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-neutral-600 dark:text-neutral-400">
      <span>{label}</span>
      <span className="text-neutral-900 dark:text-neutral-100">{value}</span>
    </div>
  );
}

type AddressFieldErrors = {
  fullName?: { message?: string };
  line1?: { message?: string };
  line2?: { message?: string };
  city?: { message?: string };
  state?: { message?: string };
  postalCode?: { message?: string };
  country?: { message?: string };
  phone?: { message?: string };
};

// Using a union of the two valid prefixes so react-hook-form's register path
// resolves without `any`.
function AddressFields({
  prefix,
  register,
  errors,
}: {
  prefix: "shipping" | "billing";
  register: ReturnType<typeof useForm<CheckoutInput>>["register"];
  errors?: AddressFieldErrors;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Full name" error={errors?.fullName?.message}>
          <input
            type="text"
            autoComplete="name"
            className={inputClass}
            {...register(`${prefix}.fullName` as const)}
          />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Address line 1" error={errors?.line1?.message}>
          <input
            type="text"
            autoComplete="address-line1"
            className={inputClass}
            {...register(`${prefix}.line1` as const)}
          />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field
          label="Address line 2 (optional)"
          error={errors?.line2?.message}
        >
          <input
            type="text"
            autoComplete="address-line2"
            className={inputClass}
            {...register(`${prefix}.line2` as const)}
          />
        </Field>
      </div>
      <Field label="City" error={errors?.city?.message}>
        <input
          type="text"
          autoComplete="address-level2"
          className={inputClass}
          {...register(`${prefix}.city` as const)}
        />
      </Field>
      <Field label="State / Region" error={errors?.state?.message}>
        <input
          type="text"
          autoComplete="address-level1"
          className={inputClass}
          {...register(`${prefix}.state` as const)}
        />
      </Field>
      <Field label="Postal code" error={errors?.postalCode?.message}>
        <input
          type="text"
          autoComplete="postal-code"
          className={inputClass}
          {...register(`${prefix}.postalCode` as const)}
        />
      </Field>
      <Field label="Country" error={errors?.country?.message}>
        <input
          type="text"
          autoComplete="country-name"
          className={inputClass}
          {...register(`${prefix}.country` as const)}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Phone (optional)" error={errors?.phone?.message}>
          <input
            type="tel"
            autoComplete="tel"
            className={inputClass}
            {...register(`${prefix}.phone` as const)}
          />
        </Field>
      </div>
    </div>
  );
}
