// Server-only cart operations. All mutations re-read the live
// `ProductVariant` row so client-supplied prices/stock can never be trusted.
import "server-only";

import mongoose, { type PipelineStage } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { Cart } from "@/models/Cart";
import { CartItem } from "@/models/CartItem";
import { ProductVariant } from "@/models/ProductVariant";

import { MAX_QTY_PER_ITEM, type CartItem as CartItemClient } from "./types";

function toObjectId(value: string): mongoose.Types.ObjectId | null {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function clampAgainstStock(quantity: number, inStock: number): number {
  if (!Number.isFinite(quantity)) return 0;
  const ceil = Math.min(MAX_QTY_PER_ITEM, Math.max(inStock, 0));
  if (ceil <= 0) return 0;
  return Math.max(0, Math.min(Math.floor(quantity), ceil));
}

// Every user gets exactly one cart row (enforced by the partial unique index
// on `userId`). Upsert so concurrent first-add-from-two-tabs never crashes.
async function getOrCreateUserCartId(
  userId: mongoose.Types.ObjectId,
): Promise<mongoose.Types.ObjectId> {
  const existing = await Cart.findOne({ userId }).select({ _id: 1 }).lean();
  if (existing) return existing._id;

  try {
    const created = await Cart.create({ userId });
    return created._id;
  } catch (err: unknown) {
    // Race: another request created the row first. Re-fetch.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      const retry = await Cart.findOne({ userId }).select({ _id: 1 }).lean();
      if (retry) return retry._id;
    }
    throw err;
  }
}

// Builds the aggregation that joins each cart item to its variant → product →
// color → size → primary image, producing the exact CartItem shape the client
// drawer already consumes. One round trip, one render.
function cartItemsPipeline(
  cartId: mongoose.Types.ObjectId,
): PipelineStage[] {
  return [
    { $match: { cartId } },
    {
      $lookup: {
        from: "productvariants",
        localField: "productVariantId",
        foreignField: "_id",
        as: "variant",
      },
    },
    { $unwind: "$variant" },
    {
      $lookup: {
        from: "products",
        localField: "variant.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $lookup: {
        from: "colors",
        localField: "variant.colorId",
        foreignField: "_id",
        as: "color",
      },
    },
    { $unwind: "$color" },
    {
      $lookup: {
        from: "sizes",
        localField: "variant.sizeId",
        foreignField: "_id",
        as: "size",
      },
    },
    { $unwind: "$size" },
    {
      $lookup: {
        from: "productimages",
        let: { pid: "$product._id", vid: "$variant._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$productId", "$$pid"] },
                  {
                    $or: [
                      { $eq: ["$variantId", "$$vid"] },
                      { $eq: ["$variantId", null] },
                    ],
                  },
                ],
              },
            },
          },
          // Prefer variant-specific + primary; fall back to any.
          {
            $addFields: {
              _variantMatch: { $eq: ["$variantId", "$$vid"] },
            },
          },
          { $sort: { _variantMatch: -1, isPrimary: -1, sortOrder: 1 } },
          { $limit: 1 },
        ],
        as: "primaryImage",
      },
    },
    { $sort: { createdAt: 1 } },
    {
      $project: {
        _id: 0,
        quantity: 1,
        variantId: { $toString: "$variant._id" },
        productId: { $toString: "$product._id" },
        productSlug: "$product.slug",
        productName: "$product.name",
        imageUrl: {
          $ifNull: [{ $arrayElemAt: ["$primaryImage.url", 0] }, null],
        },
        color: { name: "$color.name", hexCode: "$color.hexCode" },
        size: { name: "$size.name" },
        price: { $ifNull: ["$variant.salePrice", "$variant.price"] },
        fullPrice: "$variant.price",
        inStock: "$variant.inStock",
      },
    },
  ];
}

export type ServerCart = {
  items: CartItemClient[];
};

export async function getCartForUser(userId: string): Promise<ServerCart> {
  const uid = toObjectId(userId);
  if (!uid) return { items: [] };

  await connectToDatabase();
  const cartId = await getOrCreateUserCartId(uid);

  const items = await CartItem.aggregate<CartItemClient>(
    cartItemsPipeline(cartId),
  );
  return { items };
}

// Validates the variant exists, pulls live `inStock`, merges with any existing
// row via atomic `$inc`, clamps result. Returns the *new* authoritative qty
// for this line (or 0 if removed).
export async function addItemToServerCart(
  userId: string,
  input: { variantId: string; quantity: number },
): Promise<ServerCart> {
  const uid = toObjectId(userId);
  const vid = toObjectId(input.variantId);
  if (!uid || !vid) return getCartForUser(userId);

  const qtyIn = Math.floor(input.quantity);
  if (!Number.isFinite(qtyIn) || qtyIn <= 0) return getCartForUser(userId);

  await connectToDatabase();

  const variant = await ProductVariant.findById(vid).select({ inStock: 1 }).lean();
  if (!variant) return getCartForUser(userId);

  const cartId = await getOrCreateUserCartId(uid);

  // Find the existing row so we can compute the clamped result.
  const existing = await CartItem.findOne({
    cartId,
    productVariantId: vid,
  })
    .select({ quantity: 1 })
    .lean();

  const nextQty = clampAgainstStock(
    (existing?.quantity ?? 0) + qtyIn,
    variant.inStock,
  );

  if (nextQty <= 0) {
    // Stock dropped to 0 after add-to-cart; refuse to create / keep the row.
    if (existing) {
      await CartItem.deleteOne({ _id: existing._id });
    }
    return getCartForUser(userId);
  }

  await CartItem.updateOne(
    { cartId, productVariantId: vid },
    { $set: { quantity: nextQty } },
    { upsert: true },
  );

  return getCartForUser(userId);
}

export async function setItemQuantityInServerCart(
  userId: string,
  variantId: string,
  quantity: number,
): Promise<ServerCart> {
  const uid = toObjectId(userId);
  const vid = toObjectId(variantId);
  if (!uid || !vid) return getCartForUser(userId);

  await connectToDatabase();

  const variant = await ProductVariant.findById(vid).select({ inStock: 1 }).lean();
  if (!variant) return getCartForUser(userId);

  const cartId = await getOrCreateUserCartId(uid);
  const nextQty = clampAgainstStock(quantity, variant.inStock);

  if (nextQty <= 0) {
    await CartItem.deleteOne({ cartId, productVariantId: vid });
  } else {
    await CartItem.updateOne(
      { cartId, productVariantId: vid },
      { $set: { quantity: nextQty } },
      { upsert: true },
    );
  }

  return getCartForUser(userId);
}

export async function removeItemFromServerCart(
  userId: string,
  variantId: string,
): Promise<ServerCart> {
  const uid = toObjectId(userId);
  const vid = toObjectId(variantId);
  if (!uid || !vid) return getCartForUser(userId);

  await connectToDatabase();
  const cartId = await getOrCreateUserCartId(uid);
  await CartItem.deleteOne({ cartId, productVariantId: vid });
  return getCartForUser(userId);
}

// Merge a guest cart (array of { variantId, quantity }) into the user's cart.
// Sums duplicates, validates each variant, clamps against live stock.
export async function mergeGuestCartIntoServerCart(
  userId: string,
  guestItems: { variantId: string; quantity: number }[],
): Promise<ServerCart> {
  const uid = toObjectId(userId);
  if (!uid) return getCartForUser(userId);

  await connectToDatabase();
  const cartId = await getOrCreateUserCartId(uid);

  // Dedupe on the way in (client could've sent the same variant twice).
  const bucket = new Map<string, number>();
  for (const g of guestItems) {
    if (!mongoose.Types.ObjectId.isValid(g.variantId)) continue;
    const qty = Math.floor(g.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    bucket.set(g.variantId, (bucket.get(g.variantId) ?? 0) + qty);
  }
  if (bucket.size === 0) return getCartForUser(userId);

  const variantIds = [...bucket.keys()].map(
    (id) => new mongoose.Types.ObjectId(id),
  );
  const variants = await ProductVariant.find({ _id: { $in: variantIds } })
    .select({ inStock: 1 })
    .lean();
  const stockByVariant = new Map(
    variants.map((v) => [String(v._id), v.inStock]),
  );

  const existing = await CartItem.find({
    cartId,
    productVariantId: { $in: variantIds },
  })
    .select({ productVariantId: 1, quantity: 1 })
    .lean();
  const existingQty = new Map(
    existing.map((e) => [String(e.productVariantId), e.quantity]),
  );

  const ops = [...bucket.entries()].flatMap(([variantId, guestQty]) => {
    const stock = stockByVariant.get(variantId);
    if (stock === undefined) return [];
    const merged = clampAgainstStock(
      (existingQty.get(variantId) ?? 0) + guestQty,
      stock,
    );
    if (merged <= 0) return [];
    return [
      {
        updateOne: {
          filter: {
            cartId,
            productVariantId: new mongoose.Types.ObjectId(variantId),
          },
          update: { $set: { quantity: merged } },
          upsert: true,
        },
      },
    ];
  });

  if (ops.length > 0) {
    await CartItem.bulkWrite(ops, { ordered: false });
  }

  return getCartForUser(userId);
}
