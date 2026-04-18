import { z } from "zod";

import { MAX_QTY_PER_ITEM } from "@/lib/cart/types";

// 24-char hex ObjectId. Server also double-checks with
// mongoose.Types.ObjectId.isValid, but we reject early here to avoid the
// round trip.
const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

export const addItemSchema = z.object({
  variantId: objectId,
  // Generous upper bound on the wire; server clamps against MAX_QTY_PER_ITEM
  // and the variant's inStock before writing.
  quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM),
});

export const setQuantitySchema = z.object({
  // quantity=0 removes the item; the PATCH handler treats it the same as
  // DELETE so the client doesn't have to branch on whether it's decrementing
  // to 0 vs deleting explicitly.
  quantity: z.number().int().min(0).max(MAX_QTY_PER_ITEM),
});

export const mergeCartSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: objectId,
        quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM),
      }),
    )
    // Protect the server from a pathological localStorage full of junk.
    .max(200),
});

export type AddItemInput = z.infer<typeof addItemSchema>;
export type SetQuantityInput = z.infer<typeof setQuantitySchema>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;
