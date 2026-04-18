import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const cartSchema = new Schema(
  {
    // Logged-in user's cart. Null/undefined for guest carts.
    // Indexed via the explicit cartSchema.index() below (unique, partial).
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Guest cart identifier (cookie/session id). Null once the cart is merged
    // into a logged-in user's cart.
    sessionId: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

// A user should only have one active cart. (Using a partial index so guest
// carts without userId aren't constrained.)
cartSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } },
);

export type CartDoc = InferSchemaType<typeof cartSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Cart: Model<CartDoc> =
  (mongoose.models.Cart as Model<CartDoc>) ??
  mongoose.model<CartDoc>("Cart", cartSchema);
