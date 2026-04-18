import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const PAYMENT_METHODS = [
  "card",
  "paypal",
  "stripe",
  "cash_on_delivery",
] as const;

export const PAYMENT_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "refunded",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const paymentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },
    paidAt: { type: Date, default: null },
    transactionId: { type: String, trim: true, default: null, index: true },
  },
  { timestamps: true },
);

export type PaymentDoc = InferSchemaType<typeof paymentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Payment: Model<PaymentDoc> =
  (mongoose.models.Payment as Model<PaymentDoc>) ??
  mongoose.model<PaymentDoc>("Payment", paymentSchema);
