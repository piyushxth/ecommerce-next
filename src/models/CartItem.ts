import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const cartItemSchema = new Schema(
  {
    cartId: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
      index: true,
    },
    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { timestamps: true },
);

// One row per variant per cart; add-to-cart should bump quantity instead of
// inserting duplicates.
cartItemSchema.index({ cartId: 1, productVariantId: 1 }, { unique: true });

export type CartItemDoc = InferSchemaType<typeof cartItemSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CartItem: Model<CartItemDoc> =
  (mongoose.models.CartItem as Model<CartItemDoc>) ??
  mongoose.model<CartItemDoc>("CartItem", cartItemSchema);
