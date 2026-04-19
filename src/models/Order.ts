import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const orderSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },
    totalAmount: { type: Number, required: true, min: 0 },
    shippingAddressId: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    billingAddressId: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    contactEmail: { type: String, trim: true, maxlength: 254, default: "" },
  },
  { timestamps: true },
);

export type OrderDoc = InferSchemaType<typeof orderSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Order: Model<OrderDoc> =
  (mongoose.models.Order as Model<OrderDoc>) ??
  mongoose.model<OrderDoc>("Order", orderSchema);
