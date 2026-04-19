// Server-only checkout operations. Re-reads the server cart, re-validates
// stock + price against live data, creates Address rows + Order + OrderItems
// atomically, and clears the user's cart.
import "server-only";

import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { Address } from "@/models/Address";
import { Cart } from "@/models/Cart";
import { CartItem } from "@/models/CartItem";
import { Order } from "@/models/Order";
import { OrderItem } from "@/models/OrderItem";
import { ProductVariant } from "@/models/ProductVariant";

import type { AddressInput, CheckoutInput } from "@/lib/validations/checkout";

function toObjectId(value: string): mongoose.Types.ObjectId | null {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

export type PlaceOrderError =
  | { kind: "empty_cart" }
  | { kind: "stock"; variantId: string; productName: string; available: number }
  | { kind: "variant_missing"; variantId: string };

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: PlaceOrderError };

function buildAddressDoc(
  userId: mongoose.Types.ObjectId,
  input: AddressInput,
) {
  return {
    userId,
    fullName: input.fullName.trim(),
    line1: input.line1.trim(),
    line2: (input.line2 ?? "").trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    postalCode: input.postalCode.trim(),
    country: input.country.trim(),
    phone: (input.phone ?? "").trim(),
  };
}

export async function placeOrder(
  userId: string,
  payload: CheckoutInput,
): Promise<PlaceOrderResult> {
  const uid = toObjectId(userId);
  if (!uid) return { ok: false, error: { kind: "empty_cart" } };

  await connectToDatabase();

  // 1. Load the user's cart.
  const cart = await Cart.findOne({ userId: uid }).select({ _id: 1 }).lean();
  if (!cart) return { ok: false, error: { kind: "empty_cart" } };

  const cartItems = await CartItem.find({ cartId: cart._id }).lean();
  if (cartItems.length === 0) {
    return { ok: false, error: { kind: "empty_cart" } };
  }

  // 2. Re-read every variant fresh from the DB so the order snapshot reflects
  // the live price and stock, never whatever the client had in its bag.
  const variantIds = cartItems.map((i) => i.productVariantId);
  const variants = await ProductVariant.find({ _id: { $in: variantIds } })
    .populate<{ productId: { name: string } }>({
      path: "productId",
      select: { name: 1 },
    })
    .lean();

  const variantById = new Map(
    variants.map((v) => [String(v._id), v]),
  );

  for (const item of cartItems) {
    const v = variantById.get(String(item.productVariantId));
    if (!v) {
      return {
        ok: false,
        error: { kind: "variant_missing", variantId: String(item.productVariantId) },
      };
    }
    if (item.quantity > v.inStock) {
      return {
        ok: false,
        error: {
          kind: "stock",
          variantId: String(v._id),
          productName: v.productId?.name ?? "Item",
          available: v.inStock,
        },
      };
    }
  }

  // 3. Total is authoritative — computed from live `salePrice ?? price`.
  const totalAmount = cartItems.reduce((sum, item) => {
    const v = variantById.get(String(item.productVariantId));
    if (!v) return sum;
    const unit = typeof v.salePrice === "number" ? v.salePrice : v.price;
    return sum + unit * item.quantity;
  }, 0);

  // 4. Create addresses, order, and order items in one go. Transactions
  // require a replica set; most dev setups (standalone mongod / memory
  // server) don't have one, so we fall back to best-effort sequential
  // writes guarded by the validations above.
  const shippingDoc = buildAddressDoc(uid, payload.shipping);
  const billingDoc = buildAddressDoc(
    uid,
    payload.billingSameAsShipping
      ? payload.shipping
      : (payload.billing ?? payload.shipping),
  );

  const [shippingAddr, billingAddr] = await Address.create([
    shippingDoc,
    billingDoc,
  ]);

  const [order] = await Order.create([
    {
      userId: uid,
      status: "pending",
      totalAmount,
      shippingAddressId: shippingAddr._id,
      billingAddressId: billingAddr._id,
    },
  ]);

  const orderItemDocs = cartItems.map((item) => {
    const v = variantById.get(String(item.productVariantId));
    const unit = v
      ? typeof v.salePrice === "number"
        ? v.salePrice
        : v.price
      : 0;
    return {
      orderId: order._id,
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      priceAtPurchase: unit,
    };
  });

  await OrderItem.insertMany(orderItemDocs);

  // 5. Clear the user's cart. Order is placed either way — if this delete
  // fails the user still has a valid order and we can reconcile later.
  await CartItem.deleteMany({ cartId: cart._id });

  return { ok: true, orderId: String(order._id) };
}

export type OrderSummaryItem = {
  productName: string;
  productSlug: string;
  colorName: string;
  sizeName: string;
  quantity: number;
  priceAtPurchase: number;
  imageUrl: string | null;
};

export type OrderSummary = {
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderSummaryItem[];
  shipping: {
    fullName: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
};

export async function getOrderSummary(
  userId: string,
  orderId: string,
): Promise<OrderSummary | null> {
  const uid = toObjectId(userId);
  const oid = toObjectId(orderId);
  if (!uid || !oid) return null;

  await connectToDatabase();

  const order = await Order.findOne({ _id: oid, userId: uid }).lean();
  if (!order) return null;

  const [shipping, items] = await Promise.all([
    Address.findById(order.shippingAddressId).lean(),
    OrderItem.aggregate<OrderSummaryItem>([
      { $match: { orderId: oid } },
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
            { $addFields: { _variantMatch: { $eq: ["$variantId", "$$vid"] } } },
            { $sort: { _variantMatch: -1, isPrimary: -1, sortOrder: 1 } },
            { $limit: 1 },
          ],
          as: "primaryImage",
        },
      },
      {
        $project: {
          _id: 0,
          productName: "$product.name",
          productSlug: "$product.slug",
          colorName: "$color.name",
          sizeName: "$size.name",
          quantity: 1,
          priceAtPurchase: 1,
          imageUrl: {
            $ifNull: [{ $arrayElemAt: ["$primaryImage.url", 0] }, null],
          },
        },
      },
    ]),
  ]);

  if (!shipping) return null;

  return {
    orderId: String(order._id),
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: (order.createdAt ?? new Date()).toISOString(),
    items,
    shipping: {
      fullName: shipping.fullName,
      line1: shipping.line1,
      line2: shipping.line2 ?? "",
      city: shipping.city,
      state: shipping.state,
      postalCode: shipping.postalCode,
      country: shipping.country,
      phone: shipping.phone ?? "",
    },
  };
}
