import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const wishlistSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// A user can only wish-list a product once.
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

export type WishlistDoc = InferSchemaType<typeof wishlistSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Wishlist: Model<WishlistDoc> =
  (mongoose.models.Wishlist as Model<WishlistDoc>) ??
  mongoose.model<WishlistDoc>("Wishlist", wishlistSchema);
