import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const orderItemSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    // Price at time of purchase — snapshotted so later price changes don't
    // rewrite order history.
    priceAtPurchase: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

export type OrderItemDoc = InferSchemaType<typeof orderItemSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OrderItem: Model<OrderItemDoc> =
  (mongoose.models.OrderItem as Model<OrderItemDoc>) ??
  mongoose.model<OrderItemDoc>("OrderItem", orderItemSchema);
