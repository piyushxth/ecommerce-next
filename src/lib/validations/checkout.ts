import { z } from "zod";

// Relatively permissive on purpose — addresses vary wildly across countries
// and we don't want to reject valid input. The server re-trims everything.
//
// All fields are non-optional strings (empty allowed for truly optional ones
// like line2 / phone) so the resolved Zod type lines up cleanly with
// react-hook-form's generic — RHF fights us when fields are typed as
// `string | undefined`.
const addressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .max(120, "Full name is too long"),
  line1: z
    .string()
    .trim()
    .min(3, "Street address is required")
    .max(200, "Address line 1 is too long"),
  line2: z
    .string()
    .trim()
    .max(200, "Address line 2 is too long"),
  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(100, "City is too long"),
  state: z
    .string()
    .trim()
    .min(1, "State / region is required")
    .max(100, "State / region is too long"),
  postalCode: z
    .string()
    .trim()
    .min(2, "Postal code is required")
    .max(20, "Postal code is too long"),
  country: z
    .string()
    .trim()
    .min(2, "Country is required")
    .max(60, "Country is too long"),
  phone: z.string().trim().max(40, "Phone is too long"),
});

export const checkoutSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email"),
    shipping: addressSchema,
    billingSameAsShipping: z.boolean(),
    // Optional on the wire: when `billingSameAsShipping` is true the server
    // copies shipping into billing. When false, the superRefine below
    // requires it.
    billing: addressSchema.optional(),
    notes: z.string().trim().max(500, "Notes are too long"),
  })
  .superRefine((val, ctx) => {
    if (!val.billingSameAsShipping && !val.billing) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["billing"],
        message: "Billing address is required",
      });
    }
  });

export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
