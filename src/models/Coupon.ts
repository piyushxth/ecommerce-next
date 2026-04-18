import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const COUPON_DISCOUNT_TYPES = ["percent", "fixed"] as const;
export type CouponDiscountType = (typeof COUPON_DISCOUNT_TYPES)[number];

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: COUPON_DISCOUNT_TYPES,
      required: true,
    },
    // For `percent`: 0-100. For `fixed`: a positive amount in the same units
    // as product prices.
    discountValue: { type: Number, required: true, min: 0 },
    expiresAt: { type: Date, default: null, index: true },
    maxUsage: { type: Number, min: 0, default: null },
    usedCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

export type CouponDoc = InferSchemaType<typeof couponSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Coupon: Model<CouponDoc> =
  (mongoose.models.Coupon as Model<CouponDoc>) ??
  mongoose.model<CouponDoc>("Coupon", couponSchema);
