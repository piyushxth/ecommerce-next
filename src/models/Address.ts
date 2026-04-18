import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const addressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200, default: "" },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, maxlength: 60 },
    phone: { type: String, trim: true, maxlength: 40, default: "" },
    isDefault: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export type AddressDoc = InferSchemaType<typeof addressSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Address: Model<AddressDoc> =
  (mongoose.models.Address as Model<AddressDoc>) ??
  mongoose.model<AddressDoc>("Address", addressSchema);
